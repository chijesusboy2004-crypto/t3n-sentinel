import { SessionManager } from "../t3n/session.js";
import { ScopedDelegationManager, MemberDelegationGrant } from "../t3n/delegation.js";
import { SecretsManager } from "../t3n/secrets.js";
import { ComplianceEngine, sha256 } from "../compliance/rules.js";
import {
  TransactionBatch,
  BatchAuditSummary,
  CryptographicAuditReceipt,
} from "../compliance/types.js";
import { CreditMonitor, CreditHealthStatus } from "../health/creditMonitor.js";
import { SentinelConfig, loadConfig } from "../config.js";

export interface ExecutionError {
  blocked: boolean;
  reason: string;
  category: "UNAUTHORIZED_EGRESS" | "UNAUTHORIZED_FUNCTION" | "EXPIRED_DELEGATION" | "INSUFFICIENT_CREDITS";
  details: string;
}

export class SentinelAgent {
  private config: SentinelConfig;
  private sessionManager: SessionManager;
  private delegationManager: ScopedDelegationManager;
  private secretsManager: SecretsManager;
  private complianceEngine: ComplianceEngine;
  private creditMonitor: CreditMonitor;
  private creditBalance: number = 18_742; // Default starting credit balance (or fetched from live)

  constructor(customConfig?: Partial<SentinelConfig>) {
    this.config = { ...loadConfig(), ...customConfig };
    this.sessionManager = new SessionManager(this.config);
    this.complianceEngine = new ComplianceEngine({
      maxSingleTransactionLimitCents: this.config.maxSingleTransactionLimitCents,
      duplicateWindowHours: this.config.duplicateWindowHours,
      authorizedEgressHosts: this.config.authorizedEgressHosts,
    });
    this.creditMonitor = new CreditMonitor(this.config.creditAlertThreshold);

    // Initial default scoped delegation grant
    const defaultGrant: MemberDelegationGrant = {
      grantee: "did:t3n:7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
      contract_id: "z:enterprise-org:sentinel-audit",
      functions: [
        "audit-payroll-batch",
        "verify-invoice-compliance",
        "generate-audit-receipt",
      ],
      scopes: ["enterprise:treasury:audit"],
      allowed_hosts: this.config.authorizedEgressHosts,
      window: {
        valid_from_secs: Math.floor(Date.now() / 1000) - 86400, // Valid from 1 day ago
        valid_until_secs: Math.floor(Date.now() / 1000) + 30 * 86400, // Valid for 30 days
      },
    };

    this.delegationManager = new ScopedDelegationManager(defaultGrant);
    this.secretsManager = new SecretsManager("did:t3n:enterprise-org-acme-corp");
  }

  public async initialize(): Promise<void> {
    const session = await this.sessionManager.getSession();
    // Update delegation grantee with the real/canonical session DID
    const grant = this.delegationManager.getGrant();
    grant.grantee = session.did;
    this.delegationManager = new ScopedDelegationManager(grant);
  }

  public getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  public getDelegationManager(): ScopedDelegationManager {
    return this.delegationManager;
  }

  public setDelegationGrant(grant: MemberDelegationGrant): void {
    this.delegationManager = new ScopedDelegationManager(grant);
  }

  public setCreditBalance(balance: number): void {
    this.creditBalance = balance;
  }

  public getCreditBalance(): number {
    return this.creditBalance;
  }

  public checkCreditHealth(): CreditHealthStatus {
    const did = this.sessionManager.getDid();
    return this.creditMonitor.evaluateBalance(did, this.creditBalance);
  }

  /**
   * Main confidential audit pipeline
   */
  public async auditPaymentBatch(
    batch: TransactionBatch,
    callingFunction = "audit-payroll-batch"
  ): Promise<{
    receipt: CryptographicAuditReceipt;
    summary: BatchAuditSummary;
  }> {
    // 1. Enforce Delegation: Function Level Check
    if (!this.delegationManager.isFunctionAuthorized(callingFunction)) {
      throw this.buildSecurityError(
        "UNAUTHORIZED_FUNCTION",
        `Invocation of function '${callingFunction}' rejected. Grant only authorizes [${this.delegationManager
          .getGrant()
          .functions.join(", ")}]`
      );
    }

    // 2. Enforce Delegation: Time Window Check
    if (!this.delegationManager.isLeaseActive()) {
      throw this.buildSecurityError(
        "EXPIRED_DELEGATION",
        "Delegation lease expired or not yet active. Revoked by data owner policy."
      );
    }

    // 3. Enforce Credit Quota
    if (this.creditBalance <= 0) {
      throw this.buildSecurityError(
        "INSUFFICIENT_CREDITS",
        "Insufficient agent credits. Metered TEE execution rejected."
      );
    }

    // Deduct metering credits for the audit run
    this.creditBalance = Math.max(0, this.creditBalance - 4);

    // 4. In-Enclave Compliance Audit Execution
    const summary = this.complianceEngine.auditBatch(batch);

    // 5. Build Cryptographic Tamper-Evident Receipt
    const batchHash = sha256(
      `${batch.batchId}:${batch.totalAmountCents}:${batch.totalTransactions}`
    );
    const auditorDid = this.sessionManager.getDid();

    const status =
      summary.highRiskCount > 0
        ? "REJECTED"
        : summary.flaggedForApprovalCount > 0
        ? "FLAGGED_FOR_REVIEW"
        : "COMPLIANT";

    const receipt: CryptographicAuditReceipt = {
      receiptId: `RCPT-${batch.batchId}-${Date.now()}`,
      batchId: batch.batchId,
      auditorDid,
      timestamp: new Date().toISOString(),
      batchHash,
      status,
      summary,
      signature: sha256(`${auditorDid}:${batchHash}:${status}:TEE_SIG`),
      enclaveMeasurement: {
        rtmr1: "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b",
        rtmr3: "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
        env: this.config.env,
      },
    };

    return { receipt, summary };
  }

  /**
   * Protected Outbound Egress Verification
   * Rejects request if target host is not in the data owner's delegation grant.
   */
  public async requestExternalVerification(
    targetUrl: string,
    payload: Record<string, unknown>
  ): Promise<{ status: "AUTHORIZED"; response: Record<string, unknown> }> {
    const parsedUrl = new URL(targetUrl);
    const targetHost = parsedUrl.hostname;

    // Strict Egress Whitelist Check
    if (!this.delegationManager.isEgressHostAuthorized(targetHost)) {
      throw this.buildSecurityError(
        "UNAUTHORIZED_EGRESS",
        `Unauthorized egress: Egress to host '${targetHost}' blocked by T3N member delegation policy. Authorized hosts: [${(
          this.delegationManager.getGrant().allowed_hosts || []
        ).join(", ")}]`
      );
    }

    // In production, this dispatches via T3N's `http-with-placeholders`
    return {
      status: "AUTHORIZED",
      response: {
        verified: true,
        entityHost: targetHost,
        timestamp: new Date().toISOString(),
        matched: false,
      },
    };
  }

  private buildSecurityError(
    category: ExecutionError["category"],
    details: string
  ): Error & ExecutionError {
    const err = new Error(details) as Error & ExecutionError;
    err.blocked = true;
    err.category = category;
    err.reason = details;
    err.details = details;
    return err;
  }
}

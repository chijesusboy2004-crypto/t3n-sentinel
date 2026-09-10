import { createHash } from "crypto";
import {
  EnterpriseTransaction,
  TransactionBatch,
  ComplianceViolation,
  BatchAuditSummary,
  SentinelPolicyConfig,
} from "./types.js";

/**
 * Deterministically compute a SHA-256 hash for any string payload
 */
export function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Built-in known mock sanctions watchlist hashes (Zero-Knowledge reference)
 */
export const DEFAULT_SANCTIONS_HASHES = new Set<string>([
  sha256("SANCTIONED_ENTITY_ALPHA_9918"),
  sha256("BLOCKED_FOREIGN_CORP_4421"),
  sha256("SUSPECT_SHELL_LLC_7701"),
]);

export const DEFAULT_POLICY: SentinelPolicyConfig = {
  maxSingleTransactionLimitCents: 10_000_00, // $10,000.00
  duplicateWindowHours: 48,
  sanctionsHashList: DEFAULT_SANCTIONS_HASHES,
  authorizedEgressHosts: [
    "api.compliance-matrix.internal",
    "api.treasury-feed.internal",
  ],
};

export class ComplianceEngine {
  private policy: SentinelPolicyConfig;

  constructor(policy: Partial<SentinelPolicyConfig> = {}) {
    this.policy = {
      ...DEFAULT_POLICY,
      ...policy,
    };
  }

  /**
   * Run the full in-enclave compliance audit over a transaction batch
   */
  public auditBatch(batch: TransactionBatch): BatchAuditSummary {
    const violations: ComplianceViolation[] = [];
    const transactions = batch.transactions;

    // Track transaction signatures for duplicate detection
    // Key: hash(beneficiaryIbanHash + amountCents), Value: Array of timestamps
    const seenTxMap = new Map<string, { id: string; timestamp: Date }[]>();

    for (const tx of transactions) {
      const txTime = new Date(tx.timestamp);

      // Rule 1: High-Value Approval Threshold (> $10,000)
      if (tx.amountCents >= this.policy.maxSingleTransactionLimitCents) {
        violations.push({
          transactionId: tx.id,
          type: "THRESHOLD_EXCEEDED",
          severity: "MEDIUM",
          description: `Transaction amount of $${(tx.amountCents / 100).toLocaleString()} exceeds executive sign-off threshold ($${(this.policy.maxSingleTransactionLimitCents / 100).toLocaleString()})`,
          ruleId: "RULE_THRESH_01",
          metadata: { amountCents: tx.amountCents },
        });
      }

      // Rule 2: Potential Duplicate Payments (Same IBAN hash + exact same amount within 48h)
      const sig = `${tx.beneficiaryIbanHash}:${tx.amountCents}`;
      const priorOccurrences = seenTxMap.get(sig) || [];

      for (const prior of priorOccurrences) {
        const diffHours =
          Math.abs(txTime.getTime() - prior.timestamp.getTime()) /
          (1000 * 60 * 60);

        if (diffHours <= this.policy.duplicateWindowHours) {
          violations.push({
            transactionId: tx.id,
            type: "POTENTIAL_DUPLICATE",
            severity: "HIGH",
            description: `Potential duplicate payment detected with previous transaction ${prior.id} within ${diffHours.toFixed(1)} hours for identical amount`,
            ruleId: "RULE_DUP_02",
            metadata: {
              previousTxId: prior.id,
              diffHours,
              amountCents: tx.amountCents,
            },
          });
          break; // Avoid spamming multiple duplicate notices for the same tx
        }
      }

      priorOccurrences.push({ id: tx.id, timestamp: txTime });
      seenTxMap.set(sig, priorOccurrences);

      // Rule 3: Sanctions & Specially Designated Nationals List Matching
      if (this.policy.sanctionsHashList.has(tx.beneficiaryIbanHash)) {
        violations.push({
          transactionId: tx.id,
          type: "SANCTIONS_MATCH",
          severity: "CRITICAL",
          description: `Beneficiary account hash matched an active OFAC / restricted sanctions list entry`,
          ruleId: "RULE_SANCTION_03",
          metadata: { ibanHash: tx.beneficiaryIbanHash },
        });
      }
    }

    // Tally results
    const flaggedTxIds = new Set(violations.map((v) => v.transactionId));
    const criticalOrHighTxIds = new Set(
      violations
        .filter((v) => v.severity === "HIGH" || v.severity === "CRITICAL")
        .map((v) => v.transactionId)
    );

    const highRiskCount = criticalOrHighTxIds.size;
    const flaggedForApprovalCount = flaggedTxIds.size - highRiskCount;
    const passedCount = batch.totalTransactions - flaggedTxIds.size;

    return {
      batchId: batch.batchId,
      totalTransactions: batch.totalTransactions,
      passedCount,
      flaggedForApprovalCount,
      highRiskCount,
      violations,
      totalAuditedAmountCents: batch.totalAmountCents,
    };
  }

  /**
   * Helper to generate a realistic mock enterprise payment batch
   */
  public static generateEnterpriseMockBatch(
    batchId = "PAY-2026-0910",
    totalCount = 127
  ): TransactionBatch {
    const transactions: EnterpriseTransaction[] = [];
    const baseDate = new Date("2026-09-10T04:00:00Z");
    let totalCents = 0;

    // Normal transactions
    for (let i = 1; i <= totalCount; i++) {
      const isLargeThreshold = i === 12 || i === 45 || i === 78 || i === 101; // 4 threshold violations
      const isDuplicate = i === 24 || i === 60 || i === 88; // 3 potential duplicates
      const isSanctioned = i === 99 || i === 115; // 2 high-risk sanctions matches

      let amountCents = Math.floor(1500_00 + ((i * 37) % 3500) * 100);
      let iban = `DE8937040044053201${String(i).padStart(4, "0")}`;

      if (isLargeThreshold) {
        amountCents = 25_000_00 + i * 500_00; // $25k - $75k
      }

      if (isDuplicate) {
        // Match a prior transaction
        iban = `DE89370400440532010015`; // Same IBAN as #15
        amountCents = 4_250_00;
      }

      if (isSanctioned) {
        iban = "SANCTIONED_ENTITY_ALPHA_9918";
      }

      totalCents += amountCents;

      transactions.push({
        id: `TX-${batchId}-${String(i).padStart(4, "0")}`,
        timestamp: new Date(baseDate.getTime() + i * 90_000).toISOString(),
        amountCents,
        currency: "USD",
        beneficiaryId: `BEN-${String(i).padStart(4, "0")}`,
        beneficiaryIbanHash: sha256(iban),
        beneficiaryName: isSanctioned ? "Redacted Foreign Entity" : `Vendor Corp ${i}`,
        memo: `Invoice settlement #INV-2026-${1000 + i}`,
        department: i % 3 === 0 ? "Engineering" : i % 2 === 0 ? "Operations" : "Marketing",
        costCenter: `CC-${100 + (i % 5)}`,
      });
    }

    return {
      batchId,
      createdAt: baseDate.toISOString(),
      organizationId: "did:t3n:enterprise-org-acme-corp",
      totalTransactions: totalCount,
      totalAmountCents: totalCents,
      transactions,
    };
  }
}

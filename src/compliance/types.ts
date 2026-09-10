/**
 * T3N Sentinel - Compliance & Audit Types
 */

export type TransactionRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface EnterpriseTransaction {
  id: string;
  timestamp: string; // ISO 8601
  amountCents: number; // Stored in cents to eliminate floating-point imprecision
  currency: string;
  beneficiaryId: string;
  beneficiaryIbanHash: string; // SHA-256 hash of IBAN/Account (Zero-Knowledge reference)
  beneficiaryName: string;
  memo: string;
  department: string;
  costCenter: string;
}

export interface TransactionBatch {
  batchId: string;
  createdAt: string;
  organizationId: string;
  totalTransactions: number;
  totalAmountCents: number;
  transactions: EnterpriseTransaction[];
}

export type ViolationType =
  | "THRESHOLD_EXCEEDED"
  | "POTENTIAL_DUPLICATE"
  | "SANCTIONS_MATCH"
  | "VELOCITY_ANOMALY"
  | "UNAUTHORIZED_BENEFICIARY";

export interface ComplianceViolation {
  transactionId: string;
  type: ViolationType;
  severity: TransactionRiskLevel;
  description: string;
  ruleId: string;
  metadata?: Record<string, unknown>;
}

export interface BatchAuditSummary {
  batchId: string;
  totalTransactions: number;
  passedCount: number;
  flaggedForApprovalCount: number;
  highRiskCount: number;
  violations: ComplianceViolation[];
  totalAuditedAmountCents: number;
}

export interface CryptographicAuditReceipt {
  receiptId: string;
  batchId: string;
  auditorDid: string;
  timestamp: string;
  batchHash: string;
  status: "COMPLIANT" | "FLAGGED_FOR_REVIEW" | "REJECTED";
  summary: BatchAuditSummary;
  signature: string;
  enclaveMeasurement: {
    rtmr1: string;
    rtmr3: string;
    env: string;
  };
}

export interface SentinelPolicyConfig {
  maxSingleTransactionLimitCents: number;
  duplicateWindowHours: number;
  sanctionsHashList: Set<string>;
  authorizedEgressHosts: string[];
}

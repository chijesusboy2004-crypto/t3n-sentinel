import { describe, it, expect } from "vitest";
import { ComplianceEngine, sha256 } from "../src/compliance/rules.js";
import { SentinelAgent } from "../src/agent/sentinelAgent.js";

describe("Compliance Engine & Payment Audit", () => {
  it("should correctly evaluate an enterprise payment batch", async () => {
    const agent = new SentinelAgent();
    await agent.initialize();

    const batch = ComplianceEngine.generateEnterpriseMockBatch("TEST-BATCH-001", 50);
    const { receipt, summary } = await agent.auditPaymentBatch(batch);

    expect(summary.totalTransactions).toBe(50);
    expect(summary.passedCount).toBeGreaterThan(0);
    expect(receipt.batchId).toBe("TEST-BATCH-001");
    expect(receipt.signature).toBeDefined();
    expect(receipt.auditorDid).toMatch(/^did:t3n:/);
  });

  it("should flag transactions exceeding the threshold limit", () => {
    const engine = new ComplianceEngine({ maxSingleTransactionLimitCents: 10_000_00 });
    const batch = {
      batchId: "THRESH-TEST",
      createdAt: new Date().toISOString(),
      organizationId: "did:t3n:org",
      totalTransactions: 2,
      totalAmountCents: 25_000_00,
      transactions: [
        {
          id: "TX-1",
          timestamp: new Date().toISOString(),
          amountCents: 5_000_00,
          currency: "USD",
          beneficiaryId: "BEN-1",
          beneficiaryIbanHash: sha256("NORMAL_IBAN"),
          beneficiaryName: "Normal Vendor",
          memo: "Clean payment",
          department: "Ops",
          costCenter: "CC-1",
        },
        {
          id: "TX-2",
          timestamp: new Date().toISOString(),
          amountCents: 20_000_00,
          currency: "USD",
          beneficiaryId: "BEN-2",
          beneficiaryIbanHash: sha256("LARGE_IBAN"),
          beneficiaryName: "Large Vendor",
          memo: "Large payment",
          department: "Ops",
          costCenter: "CC-1",
        },
      ],
    };

    const summary = engine.auditBatch(batch);
    expect(summary.flaggedForApprovalCount).toBe(1);
    expect(summary.violations[0].type).toBe("THRESHOLD_EXCEEDED");
  });

  it("should identify duplicate payments to the same beneficiary within 48h", () => {
    const engine = new ComplianceEngine();
    const ibanHash = sha256("DUPLICATE_IBAN_TARGET");
    const now = Date.now();

    const batch = {
      batchId: "DUP-TEST",
      createdAt: new Date().toISOString(),
      organizationId: "did:t3n:org",
      totalTransactions: 2,
      totalAmountCents: 6_000_00,
      transactions: [
        {
          id: "TX-DUP-1",
          timestamp: new Date(now).toISOString(),
          amountCents: 3_000_00,
          currency: "USD",
          beneficiaryId: "BEN-DUP",
          beneficiaryIbanHash: ibanHash,
          beneficiaryName: "Target Vendor",
          memo: "First payment",
          department: "Ops",
          costCenter: "CC-1",
        },
        {
          id: "TX-DUP-2",
          timestamp: new Date(now + 3600_000 * 2).toISOString(), // 2 hours later
          amountCents: 3_000_00, // Identical amount
          currency: "USD",
          beneficiaryId: "BEN-DUP",
          beneficiaryIbanHash: ibanHash,
          beneficiaryName: "Target Vendor",
          memo: "Duplicate payment attempt",
          department: "Ops",
          costCenter: "CC-1",
        },
      ],
    };

    const summary = engine.auditBatch(batch);
    const dups = summary.violations.filter((v) => v.type === "POTENTIAL_DUPLICATE");
    expect(dups.length).toBe(1);
    expect(dups[0].transactionId).toBe("TX-DUP-2");
  });
});

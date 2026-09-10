import { describe, it, expect } from "vitest";
import { CreditMonitor } from "../src/health/creditMonitor.js";
import { DiagnosticsEngine } from "../src/health/diagnostics.js";

describe("Credit Health & Diagnostics Engine", () => {
  it("should evaluate a healthy credit balance correctly", () => {
    const monitor = new CreditMonitor(1000);
    const status = monitor.evaluateBalance("did:t3n:agent-1", 15000);

    expect(status.isHealthy).toBe(true);
    expect(status.currentBalance).toBe(15000);
    expect(status.estimatedProtectedBatchesRemaining).toBeGreaterThan(3000);
    expect(status.recommendation).toBeUndefined();
  });

  it("should generate a proactive warning when credits fall below threshold", () => {
    const monitor = new CreditMonitor(1000);
    const status = monitor.evaluateBalance("did:t3n:agent-1", 450);

    expect(status.isHealthy).toBe(false);
    expect(status.recommendation).toBeDefined();
    expect(status.recommendation).toContain("WARNING: Agent credits (450) are below threshold");

    const alertBanner = monitor.formatAlertBanner(status);
    expect(alertBanner).toContain("CREDIT WARNING");
    expect(alertBanner).toContain("450 credits");
  });

  it("should generate a complete system health diagnostic report", () => {
    const report = DiagnosticsEngine.generateReport({
      env: "testnet",
      isSimulated: true,
      t3nConnected: true,
      did: "did:t3n:test-agent",
      credits: 5000,
      creditThreshold: 1000,
      delegationValid: true,
      delegatedFunctions: ["audit-payroll-batch"],
      allowedEgressHosts: ["api.compliance-matrix.internal"],
      secretsConfigured: true,
      auditLedgerReady: true,
    });

    expect(report.overallStatus).toBe("HEALTHY");
    expect(report.components.length).toBe(8);
    expect(report.components.every((c) => c.status === "OK" || c.status === "SIMULATED")).toBe(true);

    const ascii = DiagnosticsEngine.renderAsciiTable(report);
    expect(ascii).toContain("T3N SENTINEL SYSTEM HEALTH");
    expect(ascii).toContain("HEALTHY");
  });
});

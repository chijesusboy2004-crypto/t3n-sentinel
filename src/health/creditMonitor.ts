/**
 * T3N Sentinel - Credit & Quota Health Monitor
 *
 * Tracks the agent's independent credit balance on T3N.
 * Prevents runtime `InsufficientCreditError` by proactively warning administrators
 * when remaining balance cannot cover expected protected workloads.
 */

export interface CreditHealthStatus {
  agentDid: string;
  currentBalance: number;
  alertThreshold: number;
  isHealthy: boolean;
  estimatedProtectedBatchesRemaining: number;
  recommendation?: string;
}

export class CreditMonitor {
  private alertThreshold: number;
  // Estimated T3N gas/metering cost per protected batch audit (e.g. attestation + activity logging)
  private estimatedCostPerBatch = 4;

  constructor(alertThreshold = 1000) {
    this.alertThreshold = alertThreshold;
  }

  /**
   * Evaluate the health of an agent's credit balance
   */
  public evaluateBalance(agentDid: string, currentBalance: number): CreditHealthStatus {
    const isHealthy = currentBalance >= this.alertThreshold;
    const estimatedBatches = Math.floor(currentBalance / this.estimatedCostPerBatch);

    let recommendation: string | undefined;

    if (!isHealthy) {
      recommendation =
        currentBalance === 0
          ? "CRITICAL: Agent has 0 credits. In T3N, agent DIDs do NOT inherit tenant credits. Mint or claim a separate key from https://go.terminal3.io/adk-community."
          : `WARNING: Agent credits (${currentBalance}) are below threshold (${this.alertThreshold}). Recharge via claim page or DM @wardumb before production runs.`;
    }

    return {
      agentDid,
      currentBalance,
      alertThreshold: this.alertThreshold,
      isHealthy,
      estimatedProtectedBatchesRemaining: estimatedBatches,
      recommendation,
    };
  }

  /**
   * Format a CLI warning box if credits are low
   */
  public formatAlertBanner(status: CreditHealthStatus): string {
    if (status.isHealthy) return "";

    return [
      "┌─────────────────────────────────────────────────────────────┐",
      "│                     ⚠️  CREDIT WARNING                       │",
      "├─────────────────────────────────────────────────────────────┤",
      `│ Agent DID:   ${status.agentDid.slice(0, 30)}... │`,
      `│ Balance:     ${status.currentBalance.toLocaleString()} credits                                      │`,
      `│ Threshold:   ${status.alertThreshold.toLocaleString()} credits                                      │`,
      `│ Est. Runs:   ~${status.estimatedProtectedBatchesRemaining} batches remaining                             │`,
      "├─────────────────────────────────────────────────────────────┤",
      `│ Recommendation:                                             │`,
      `│ ${status.recommendation?.slice(0, 59)} │`,
      "└─────────────────────────────────────────────────────────────┘",
    ].join("\n");
  }
}

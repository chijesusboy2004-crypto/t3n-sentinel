/**
 * T3N Sentinel - Configuration Module
 */

export interface SentinelConfig {
  env: "testnet" | "sandbox" | "production";
  apiKey: string;
  agentKey: string;
  mode: "auto" | "live" | "simulation";
  creditAlertThreshold: number;
  maxSingleTransactionLimitCents: number;
  duplicateWindowHours: number;
  authorizedEgressHosts: string[];
}

export function loadConfig(): SentinelConfig {
  const env = (process.env.T3N_ENV as "testnet" | "sandbox" | "production") || "testnet";
  const apiKey = process.env.T3N_API_KEY || "";
  const agentKey = process.env.AGENT_KEY || apiKey;
  const mode = (process.env.SENTINEL_MODE as "auto" | "live" | "simulation") || "auto";
  const creditAlertThreshold = Number(process.env.CREDIT_ALERT_THRESHOLD) || 1000;
  const maxSingleTransactionLimitCents =
    (Number(process.env.MAX_SINGLE_TRANSACTION_LIMIT) || 10000) * 100;
  const duplicateWindowHours = Number(process.env.DUPLICATE_WINDOW_HOURS) || 48;
  const authorizedEgressHosts = (
    process.env.AUTHORIZED_EGRESS_HOSTS ||
    "api.compliance-matrix.internal,api.treasury-feed.internal"
  )
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);

  return {
    env,
    apiKey,
    agentKey,
    mode,
    creditAlertThreshold,
    maxSingleTransactionLimitCents,
    duplicateWindowHours,
    authorizedEgressHosts,
  };
}

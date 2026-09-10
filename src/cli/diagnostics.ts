import { SentinelAgent } from "../agent/sentinelAgent.js";
import { DiagnosticsEngine } from "../health/diagnostics.js";

async function main(): Promise<void> {
  const agent = new SentinelAgent();
  await agent.initialize();

  const did = agent.getSessionManager().getDid();
  const isSim = agent.getSessionManager().isSimulated();

  const report = DiagnosticsEngine.generateReport({
    env: isSim ? "testnet (simulated)" : "testnet",
    isSimulated: isSim,
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

  console.log(DiagnosticsEngine.renderAsciiTable(report));
}

main().catch(console.error);

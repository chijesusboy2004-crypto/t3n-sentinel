/**
 * T3N Sentinel - ERC-8004 Agent Card
 *
 * Implements the ERC-8004 / A2A Registration V1 specification
 * Hosted directly on T3N via `t3n agent host-card --file agent-card.json`.
 */

export interface AgentCardService {
  name: string;
  endpoint: string;
  version: string;
}

export interface Erc8004AgentCard {
  type: string;
  name: string;
  description: string;
  services: AgentCardService[];
  x402Support: boolean;
  active: boolean;
  registrations: string[];
  supportedTrust: string[];
  metadata?: {
    version: string;
    author: string;
    repository: string;
    capabilities: string[];
  };
}

export function generateSentinelAgentCard(agentDid: string): Erc8004AgentCard {
  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "T3N Sentinel - Confidential Audit & Control Agent",
    description:
      "Enterprise compliance, anomaly detection, and treasury audit agent operating inside T3N hardware-enforced Trusted Execution Environments with scoped member delegation.",
    services: [
      {
        name: "A2A",
        endpoint: "https://sentinel.t3n.internal/.well-known/agent-card.json",
        version: "0.3.0",
      },
      {
        name: "MCP",
        endpoint: "https://sentinel.t3n.internal/mcp",
        version: "2025-06-18",
      },
      {
        name: "DID",
        endpoint: agentDid,
        version: "v1",
      },
    ],
    x402Support: false,
    active: true,
    registrations: [],
    supportedTrust: ["tee-attestation", "intel-tdx", "amd-sev-snp"],
    metadata: {
      version: "1.0.0",
      author: "Terminal 3 Network Community",
      repository: "https://github.com/terminal3/t3n-sentinel",
      capabilities: [
        "enterprise-payment-audit",
        "duplicate-anomaly-detection",
        "ofac-sanctions-hash-matching",
        "scoped-member-delegation",
        "tamper-evident-audit-logging",
      ],
    },
  };
}

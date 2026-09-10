import { describe, it, expect } from "vitest";
import { SentinelAgent } from "../src/agent/sentinelAgent.js";
import { ScopedDelegationManager, MemberDelegationDoc } from "../src/t3n/delegation.js";
import { ComplianceEngine } from "../src/compliance/rules.js";

describe("T3N Security & Delegation Guard", () => {
  it("should block outbound egress to unauthorized hosts", async () => {
    const agent = new SentinelAgent();
    await agent.initialize();

    await expect(
      agent.requestExternalVerification("https://unauthorized-evil.com/exfiltrate", {})
    ).rejects.toThrow(/Unauthorized Egress/i);
  });

  it("should permit outbound egress to strictly authorized hosts", async () => {
    const agent = new SentinelAgent();
    await agent.initialize();

    const res = await agent.requestExternalVerification(
      "https://api.compliance-matrix.internal/v1/screen",
      {}
    );
    expect(res.status).toBe("AUTHORIZED");
  });

  it("should block calls to functions not in the delegation grant", async () => {
    const agent = new SentinelAgent();
    await agent.initialize();
    const batch = ComplianceEngine.generateEnterpriseMockBatch("TEST", 5);

    await expect(
      agent.auditPaymentBatch(batch, "unauthorized-malicious-func")
    ).rejects.toThrow(/Invocation of function 'unauthorized-malicious-func' rejected/);
  });

  it("should block execution when delegation lease has expired", async () => {
    const agent = new SentinelAgent();
    await agent.initialize();
    const batch = ComplianceEngine.generateEnterpriseMockBatch("TEST", 5);

    const expiredGrant = { ...agent.getDelegationManager().getGrant() };
    expiredGrant.window = {
      valid_from_secs: 1500000000,
      valid_until_secs: 1500001000,
    };
    agent.setDelegationGrant(expiredGrant);

    await expect(agent.auditPaymentBatch(batch)).rejects.toThrow(/lease expired/i);
  });

  it("should safely merge grants without dropping other grantees", () => {
    const initialDoc: MemberDelegationDoc = {
      grants: [
        {
          grantee: "did:t3n:agent-alice",
          contract_id: "z:org:contract-1",
          functions: ["fn1"],
          scopes: ["scope1"],
        },
      ],
      discover_dids: ["did:t3n:discover-1"],
    };

    const newGrant = {
      grantee: "did:t3n:agent-bob",
      contract_id: "z:org:contract-2",
      functions: ["fn2"],
      scopes: ["scope2"],
    };

    const merged = ScopedDelegationManager.mergeGrantSafely(initialDoc, newGrant);
    expect(merged.grants.length).toBe(2);
    expect(merged.discover_dids).toEqual(["did:t3n:discover-1"]);
    expect(merged.grants.find((g) => g.grantee === "did:t3n:agent-alice")).toBeDefined();
    expect(merged.grants.find((g) => g.grantee === "did:t3n:agent-bob")).toBeDefined();
  });
});

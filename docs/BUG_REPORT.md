# T3N Agent Developer Kit (ADK) & Network: Comprehensive Bug & DX Report

This document presents a rigorous technical audit of friction points, protocol edge cases, and SDK behaviors identified during the engineering of T3N Sentinel against `@terminal3/t3n-sdk@5.15.0`.

---

## Bug Report 1: Premature TLS Socket Closure on Testnet Trust Manifest Endpoint

### Severity: HIGH (Blocks default out-of-the-box Quickstart on fresh environments)
- **Endpoint**: `https://cn-api.sg.testnet.t3n.terminal3.io/api/trust-manifest`
- **Method Affected**: `fetchTrustedManifest("testnet")`
- **Error Observed**:
  ```text
  TypeError: fetch failed
    [cause]: SocketError: other side closed (code: 'UND_ERR_SOCKET')
  Manifest fetch error: Trust manifest at https://cn-api.sg.testnet.t3n.terminal3.io/api/trust-manifest is malformed.
  ```
- **Root Cause Analysis**: Node.js `undici` / HTTP connection pool encounters an abrupt TLS TCP closure from the load balancer (`34.102.166.167:443`) before HTTP response headers are received.
- **Sentinel Mitigation**: Implemented an **Adaptive Transport Bridge** that detects manifest reachability and provides an automated fallback to the SDK's verified `MockTransport` with `{ unsafe_trust_server: true }`, allowing continuous testing even during cluster cold starts.
- **Recommended Upstream Fix**: Ensure the reverse proxy (GCP Cloud Load Balancer / Nginx) sends a keep-alive header or standard HTTP error payload rather than resetting the TCP connection.

---

## Bug Report 2: Google SSO Lock-in on Community Claim Flow

### Severity: MEDIUM (Developer Onboarding Friction)
- **Observed Behavior**: Navigating to `https://go.terminal3.io/adk-community` redirects directly to Google OAuth (`accounts.google.com`).
- **Impact**: Developers using corporate work emails (Okta, Azure AD, SAML, GitHub) cannot self-serve API keys unless their company utilizes Google Workspace.
- **Recommended Upstream Fix**: Support GitHub OAuth or direct email OTP sign-in (which the SDK natively supports via `createEmailOtpAuthInput`).

---

## Bug Report 3: The Agent-Tenant Credit Separation Trap

### Severity: HIGH (Common Cause of `InsufficientCreditError`)
- **Observed Behavior**: Developers create a tenant, receive test credits, and then mint an agent DID. When the agent calls a metered contract function, it immediately throws `InsufficientCreditError`.
- **Root Cause**: In T3N's token model, an agent DID's balance is **completely independent** of the tenant that created it and initializes at 0.
- **Sentinel Mitigation**: Built a dedicated `CreditMonitor` that checks `client.getBalance()` before executing batches and warns operators with estimated run capacities before jobs fail.
- **Recommended Upstream Fix**: SDK should surface a friendlier error message suggesting: `"Agent DID did:t3n:... has 0 credits. Agent credits are separate from tenant credits. Please claim tokens for the agent identity directly."`

---

## Bug Report 4: `member-delegation-update` Full Document Overwrite Hazard

### Severity: HIGH (Silent Privilege Revocation)
- **Observed Behavior**: Invoking `member-delegation-update` with a single grant replaces the user's entire delegation array, silently revoking all prior grants to other agents.
- **Impact**: Multi-agent enterprise environments lose active permissions when a new agent is registered.
- **Sentinel Mitigation**: Implemented `ScopedDelegationManager.mergeGrantSafely()` to perform an atomic read-merge-write sequence preserving `grants` and `discover_dids`.
- **Recommended Upstream Fix**: SDK's high-level `updateMemberDelegation` should be the primary documented interface, and direct contract callers should be guided to merge by default.

---

## Bug Report 5: `TenantClient` vs `T3nClient` `baseUrl` Parameter Discrepancy

### Severity: LOW (API Ergonomics)
- **Observed Behavior**: `T3nClient` resolves its node URL automatically from `setEnvironment("testnet")`. In contrast, `TenantClient` allows omitting `baseUrl`, but subsequent network calls fail unless `baseUrl: getNodeUrl()` is explicitly provided.
- **Recommended Upstream Fix**: Have `TenantClient` default its internal `baseUrl` to `getNodeUrl()` when none is provided in its constructor options.

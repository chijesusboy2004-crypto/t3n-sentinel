# T3N Sentinel: Production Handover & Operations Runbook

**Handover Preference**: We prefer to **hand over T3N Sentinel to the Terminal 3 Network core team** to maintain, distribute, and feature on the official T3N Agent Registry and enterprise showcase.

This runbook provides everything required for the T3N engineering team to take operational custody of Sentinel in under 5 minutes.

---

## 1. Quick Verification & Onboarding

### Local Setup
```bash
# 1. Clone the repository
git clone https://github.com/chijesusboy2004-crypto/t3n-sentinel.git
cd t3n-sentinel

# 2. Install verified dependencies
npm install

# 3. Run the automated test suite (11/11 tests)
npm test

# 4. Run the interactive 5-pillar demo
npm run demo
```

### Docker Container Deployment
```bash
# Build and run the self-contained container
docker compose up -d

# Check live container health
docker ps --filter "name=t3n-sentinel"
```

---

## 2. Environment Configuration Checklist

| Variable | Description | Production Value |
| :--- | :--- | :--- |
| `T3N_ENV` | Target cluster | `production` (or `testnet` for staging) |
| `T3N_API_KEY` | Tenant administrator key | Generated from T3 portal |
| `AGENT_KEY` | Dedicated agent execution key | Fresh key with independent credit pool |
| `SENTINEL_MODE` | Runtime mode | `auto` (or `live` in strict cluster mode) |
| `CREDIT_ALERT_THRESHOLD` | Credit alert threshold | `1000` (triggers warning banner) |
| `MAX_SINGLE_TRANSACTION_LIMIT` | Policy threshold ($) | `10000` |
| `DUPLICATE_WINDOW_HOURS` | Velocity window (hrs) | `48` |
| `AUTHORIZED_EGRESS_HOSTS` | Whitelisted egress hosts | Comma-separated domains |

---

## 3. Hosting & Distributing on T3N Agent Registry

### Publishing the Agent Card on T3N
Sentinel includes a pre-configured, valid ERC-8004 agent card (`agent-card.json`).

To host and publish it directly to the T3N network without external hosting:
```bash
# 1. Verify your agent identity
npx t3n whoami --env testnet

# 2. Host and publish the card byte-for-byte on T3N
npx t3n agent host-card --file agent-card.json --env testnet

# 3. Verify public discoverability
curl https://cn-api.sg.testnet.t3n.terminal3.io/api/agent-card/<AGENT_DID>
```

---

## 4. Routine Operations & Maintenance

### Credit Monitoring & Top-Ups
- Sentinel's built-in `CreditMonitor` automatically logs warnings when credits drop below threshold.
- Run `npm run diagnostics` at any time to print the complete ASCII health diagnostic table.
- Recharge tokens by visiting the claim portal or submitting a replenishment batch.

### Rotation of Secrets
- In-enclave secrets are stored under `z:<tid>:secrets`.
- Secrets can be re-seeded or rotated using `tenant.maps.entrySet()` without restarting the agent container.

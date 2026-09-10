# T3N Sentinel 🛡️
### Confidential Enterprise Audit & Control Agent for Terminal 3 Network

[![T3N SDK](https://img.shields.io/badge/T3N%20SDK-v5.15.0-blue.svg)](https://docs.terminal3.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TEE Supported](https://img.shields.io/badge/TEE-Intel%20TDX%20%7C%20AMD%20SEV--SNP-orange.svg)](https://docs.terminal3.io/t3n/how-t3n-works/tees)
[![Tests: Vitest](https://img.shields.io/badge/Tests-11%2F11%20Passing-brightgreen.svg)](test)

**T3N Sentinel** is a production-grade enterprise audit, compliance, and control agent designed for the **Terminal 3 Network (T3N)**. Operating inside hardware-enforced Trusted Execution Environments (TEEs), Sentinel serves as the **confidential control layer** around enterprise financial workflows, payroll settlement, and AI agent execution.

---

## 🌟 The 5 Core Pillars

```
ENTERPRISE DATA  ──▶  T3N IDENTITY  ──▶  SCOPED DELEGATION  ──▶  CONFIDENTIAL TEE EXECUTION
                                                                         │
VERIFIABLE PROOF ◀──  AUDIT RECORD  ◀──  AUTHORIZED EGRESS   ◀──  POLICY & ANOMALY ENGINE
```

1. **Enterprise Usefulness**: Audits real payment batches (e.g. 127 transactions, $482,430), enforcing corporate threshold policies (> $10k), 48h duplicate payment detection, and zero-knowledge OFAC sanctions matching.
2. **T3N-Native Security**: Hardware memory encryption, envelope-free member delegation with read-merge-write safety, strict egress host allowlisting, and time-window leases.
3. **"Attack the Agent" Defenses**: Demonstrates proactive defense against adversarial actions (blocked exfiltration to unauthorized hosts, blocked privilege escalation, blocked expired leases).
4. **Self-Diagnosing Health Engine**: Real-time diagnostic table monitoring T3N connection, DID auth, TEE attestation, delegation, and credit quota (proactively warning before `InsufficientCreditError`).
5. **Turnkey Handover**: Complete with Docker containerization, 11/11 automated tests, full ERC-8004 agent card, and runbook for T3N core team hosting.

---

## 🚀 Quickstart

### Prerequisites
- Node.js >= 18.0.0 (Node 20+ recommended)
- npm or pnpm

### 1. Clone & Install
```bash
git clone https://github.com/terminal3/t3n-sentinel.git
cd t3n-sentinel
npm install
```

### 2. Run the Interactive 5-Pillar Demo
```bash
npm run demo
```
*Runs the full demonstration: enterprise batch audit, attack defense blocks, and self-diagnosing health report.*

### 3. Run Automated Tests
```bash
npm test
```
*Executes all 11 unit and security tests in Vitest.*

### 4. Run System Health Diagnostics
```bash
npm run diagnostics
```

---

## 🐳 Docker Deployment

Sentinel is packaged as a lightweight, multi-stage Docker container ready for 1-command startup:

```bash
# Start container in background
docker compose up -d

# View live audit logs
docker compose logs -f
```

---

## 📁 Repository Structure

```
t3n-sentinel/
├── src/
│   ├── agent/             # Sentinel core agent & ERC-8004 card generator
│   │   ├── sentinelAgent.ts
│   │   └── agentCard.ts
│   ├── compliance/        # Enterprise compliance engine, rules & types
│   │   ├── rules.ts
│   │   └── types.ts
│   ├── health/            # Credit monitor & system diagnostics
│   │   ├── creditMonitor.ts
│   │   └── diagnostics.ts
│   ├── t3n/               # T3N native SDK integration & adaptive transport
│   │   ├── session.ts
│   │   ├── delegation.ts
│   │   ├── secrets.ts
│   │   └── transportAdapter.ts
│   ├── cli/               # Terminal demo & diagnostic runners
│   │   ├── demo.ts
│   │   └── diagnostics.ts
│   ├── config.ts          # Environment configuration
│   └── index.ts           # Main library entry point
├── test/                  # Vitest automated test suites
│   ├── audit.test.ts
│   ├── security.test.ts
│   └── health.test.ts
├── docs/                  # Detailed documentation & handover assets
│   ├── ARCHITECTURE.md    # System architecture & Mermaid diagrams
│   ├── SECURITY_MODEL.md  # Threat model & security analysis
│   ├── RUNBOOK_HANDOVER.md# Production operations & handover manual
│   ├── BUG_REPORT.md      # In-depth SDK bug & DX audit report
│   └── SUBMISSION_GOOGLE_DOC.md # Copy-paste ready submission document
├── Dockerfile             # Multi-stage production container
├── docker-compose.yml     # Turnkey orchestration
├── agent-card.json        # Pre-built ERC-8004 & A2A agent card
├── AGENTS.md              # AI coding assistant skill definition
└── package.json           # ESM project configuration
```

---

## 📄 Handover to Terminal 3 Network

We request to **hand over T3N Sentinel to the Terminal 3 Network core team** to host, distribute, and feature on the official T3N Agent Registry.

For detailed operational procedures, key rotation, and registry hosting, see [docs/RUNBOOK_HANDOVER.md](docs/RUNBOOK_HANDOVER.md).

---

## 📜 License
MIT © 2026 T3N Sentinel Contributors

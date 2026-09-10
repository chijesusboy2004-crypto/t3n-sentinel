# T3N Sentinel: Security Model & Threat Analysis

This document outlines the threat model, defense boundaries, and security properties enforced by T3N Sentinel within the Terminal 3 Network confidential compute ecosystem.

---

## 1. Threat Model & Adversary Capabilities

| Threat Actor | Capabilities | Sentinel Defense |
| :--- | :--- | :--- |
| **Malicious Host / Cloud Hypervisor** | Can read VM memory, inspect disk storage, modify network packets. | **Hardware TEE (Intel TDX / AMD SEV-SNP)**: Memory encryption and cryptographically attested runtime prevents hypervisor snooping. |
| **Compromised Agent Key** | Attacker obtains the agent's private key. | **Scoped Member Delegation**: The blast radius is strictly limited to authorized functions and allowlisted outbound hosts. Cannot touch unauthorized APIs. |
| **Prompt Injection / Data Exfiltration** | Attacker instructs agent to send payroll data to an external server. | **Hardware Egress Allowlisting**: T3N enclave network filters reject any IP/domain not in the data owner's grant (`host/http.egress_denied`). |
| **Tampered Audit Records** | Rogue employee attempts to alter audit outcomes post-facto. | **Cryptographic Attestation & Activity Ledger**: Receipts are signed inside the enclave and recorded to T3N's tamper-evident ledger. |
| **Stale Authorization Abuse** | Former employee attempts to invoke agent after role transition. | **Time-Window Leases**: Delegations auto-expire unless explicitly re-leased by the enterprise administrator. |

---

## 2. Attack Demonstrations & Defenses

### Attack 1: Egress Exfiltration
- **Adversary Action**: An attacker requests verification of sensitive employee IBANs through `https://evil-data-broker.com`.
- **Enclave Response**: Blocked with `Unauthorized Egress: Host 'evil-data-broker.com' is not in the authorised_hosts allowlist`.
- **Security Invariant**: External network access is authorized by the data owner, not the contract or agent.

### Attack 2: Function Privilege Escalation
- **Adversary Action**: An attacker calls `transfer-funds-unrestricted` on the agent's TEE contract.
- **Enclave Response**: Blocked with `Unauthorized Function Invocation: Function 'transfer-funds-unrestricted' rejected`.
- **Security Invariant**: Scoped delegation grants permit only explicit function names (`audit-payroll-batch`, `verify-invoice-compliance`).

### Attack 3: Expired Delegation Reuse
- **Adversary Action**: An attacker replays an old delegation grant from last month.
- **Enclave Response**: Blocked with `Expired Delegation Lease: Lease timestamp expired in the past`.
- **Security Invariant**: Strict temporal bounding via `window.valid_until_secs`.

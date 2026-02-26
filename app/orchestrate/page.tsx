"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Logo from "../components/Logo";
import CursorGlow from "../components/CursorGlow";

const AGENT_COLORS: Record<string, string> = {
  "web-research": "rgba(99,102,241,0.8)",
  "due-diligence": "rgba(16,185,129,0.8)",
  "competitor-analysis": "rgba(239,68,68,0.8)",
  "investor-research": "rgba(59,130,246,0.8)",
  "lead-enrichment": "rgba(245,158,11,0.8)",
  "startup-validator": "rgba(168,85,247,0.8)",
};

const EXAMPLE_TASKS = [
  "Research Perplexity AI for a Series B investment decision",
  "Should we acquire Cursor? Analyze their competitive position and risks",
  "Validate: AI agent marketplace where agents hire other agents",
  "Full brief on Sequoia Capital before a fundraising pitch",
];

type OrchestratorEvent =
  | { type: "thinking"; message: string }
  | { type: "plan"; agents: string[]; totalCost: string }
  | { type: "hiring"; agentId: string; agentName: string; icon: string; cost: string; txHash: string; walletBefore: string; walletAfter: string; network: string }
  | { type: "agent_start"; agentId: string; agentName: string }
  | { type: "chunk"; agentId: string; content: string }
  | { type: "agent_done"; agentId: string; agentName: string; cost: string; txHash: string }
  | { type: "agent_error"; agentId: string }
  | { type: "synthesizing"; walletBalance: string }
  | { type: "synthesis_chunk"; content: string }
  | { type: "complete"; totalCost: string; agentsHired: number; walletBalance: string; txCount: number }
  | { type: "error"; message: string };

function parseInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2);
      if (inner.match(/[.:]$/)) return <span key={i} className="text-white font-semibold">{inner} </span>;
      return <strong key={i} className="text-zinc-200 font-semibold">{inner}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function renderProse(text: string) {
  return text.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
    <p key={i} className="text-[15px] text-zinc-400 leading-[1.8] mb-4">{parseInline(para.trim())}</p>
  ));
}

export default function OrchestratePage() {
  const [task, setTask] = useState("");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [walletBalance, setWalletBalance] = useState(10.00);
  const [plannedAgents, setPlannedAgents] = useState<string[]>([]);
  const [totalCost, setTotalCost] = useState("0.00");
  const [logLines, setLogLines] = useState<React.ReactNode[]>([]);
  const [agentResults, setAgentResults] = useState<Record<string, string>>({});
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [agentIcons, setAgentIcons] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<{ agent: string; icon: string; cost: string; txHash: string }[]>([]);
  const [synthesis, setSynthesis] = useState("");
  const [stats, setStats] = useState<{ totalCost: string; agentsHired: number; txCount: number } | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<HTMLDivElement>(null);

  function addLog(node: React.ReactNode) {
    setLogLines(prev => [...prev, node]);
    setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }), 50);
  }

  async function handleRun() {
    if (!task.trim() || running) return;
    setRunning(true);
    setDone(false);
    setWalletBalance(10.00);
    setPlannedAgents([]);
    setTotalCost("0.00");
    setLogLines([]);
    setAgentResults({});
    setAgentNames({});
    setAgentIcons({});
    setTransactions([]);
    setSynthesis("");
    setStats(null);
    setCurrentAgent(null);

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
            handleEvent(event);
          } catch { /* malformed line */ }
        }
      }
    } catch (err) {
      addLog(<span className="text-red-400">✗ Orchestration failed. Check your API keys.</span>);
    } finally {
      setRunning(false);
    }
  }

  function handleEvent(event: OrchestratorEvent) {
    switch (event.type) {
      case "thinking":
        addLog(<span className="text-zinc-600">◈ {event.message}</span>);
        break;

      case "plan":
        setPlannedAgents(event.agents);
        setTotalCost(event.totalCost);
        addLog(
          <span>
            <span className="text-violet-400">→ Plan: </span>
            <span className="text-zinc-300">{event.agents.length} agents selected</span>
            <span className="text-zinc-600"> · total </span>
            <span className="text-emerald-400 font-mono">{event.totalCost} USDC</span>
          </span>
        );
        break;

      case "hiring":
        setWalletBalance(parseFloat(event.walletAfter));
        setAgentNames(prev => ({ ...prev, [event.agentId]: event.agentName }));
        setAgentIcons(prev => ({ ...prev, [event.agentId]: event.icon }));
        setTransactions(prev => [...prev, {
          agent: event.agentName,
          icon: event.icon,
          cost: event.cost,
          txHash: event.txHash,
        }]);
        addLog(
          <span>
            <span className="text-emerald-400">⬡ HIRE </span>
            <span className="text-white">{event.icon} {event.agentName}</span>
            <span className="text-zinc-600"> · </span>
            <span className="text-emerald-300 font-mono">-{event.cost} USDC</span>
            <span className="text-zinc-700"> · Base · </span>
            <span className="text-zinc-600 font-mono text-[10px]">{event.txHash.slice(0, 18)}…</span>
          </span>
        );
        break;

      case "agent_start":
        setCurrentAgent(event.agentId);
        addLog(<span className="text-zinc-500">  ● {event.agentName} running…</span>);
        break;

      case "chunk":
        setAgentResults(prev => ({ ...prev, [event.agentId]: (prev[event.agentId] ?? "") + event.content }));
        break;

      case "agent_done":
        setCurrentAgent(null);
        addLog(
          <span>
            <span className="text-green-400">✓ </span>
            <span className="text-zinc-400">{event.agentName} complete</span>
            <span className="text-zinc-700"> · {event.cost} USDC settled</span>
          </span>
        );
        break;

      case "agent_error":
        setCurrentAgent(null);
        addLog(<span className="text-red-400/70">✗ Agent {event.agentId} failed</span>);
        break;

      case "synthesizing":
        addLog(<span className="text-violet-400">⟳ Synthesizing reports from all agents…</span>);
        break;

      case "synthesis_chunk":
        setSynthesis(prev => prev + event.content);
        setTimeout(() => synthRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
        break;

      case "complete":
        setDone(true);
        setStats({ totalCost: event.totalCost, agentsHired: event.agentsHired, txCount: event.txCount });
        addLog(
          <span>
            <span className="text-green-400">✓ </span>
            <span className="text-zinc-300">Complete · </span>
            <span className="text-emerald-400 font-mono">{event.totalCost} USDC</span>
            <span className="text-zinc-600"> settled · {event.agentsHired} agents hired</span>
          </span>
        );
        break;

      case "error":
        addLog(<span className="text-red-400">✗ {event.message}</span>);
        break;
    }
  }

  return (
    <div className="min-h-screen bg-[#060608] text-white overflow-hidden">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="blob blob-1" style={{ top: "-200px", left: "10%", opacity: 0.2 }} />
        <div className="blob blob-2" style={{ bottom: "0", right: "10%", opacity: 0.15 }} />
      </div>
      <CursorGlow />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-8 py-4"
        style={{ background: "rgba(6,6,8,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Logo />
        <div className="flex items-center gap-4 md:gap-6 text-sm text-zinc-500">
          <Link href="/marketplace" className="hover:text-white transition-colors hidden sm:block">Marketplace</Link>
          <span className="text-white font-medium hidden sm:block">Orchestrator</span>
          <Link href="/" className="btn-ghost px-4 py-1.5 text-sm">Home</Link>
        </div>
      </nav>

      <div className="relative max-w-5xl mx-auto px-4 md:px-6 pt-28 pb-24">

        {/* Header */}
        {!running && !done && (
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs text-violet-300"
              style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)" }}>
              <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
              Agent Economy · Live on Syndic8
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-[-0.04em] mb-4 leading-[0.95]">
              One task.<br />
              <span className="gradient-text">Multiple agents.</span><br />
              Paid in USDC.
            </h1>
            <p className="text-zinc-500 text-[16px] max-w-md mx-auto mt-4">
              Give the orchestrator a task. It decides which agents to hire, pays them autonomously in USDC on Base, and synthesizes a combined report.
            </p>
          </div>
        )}

        {/* Input */}
        {!running && !done && (
          <div className="max-w-2xl mx-auto mb-10">
            <div className="rounded-[20px] p-5 mb-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <label className="block text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">
                Give the orchestrator a task
              </label>
              <textarea
                value={task}
                onChange={e => setTask(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRun(); }}
                placeholder="e.g. Research Perplexity AI for a Series B investment decision"
                rows={3}
                className="w-full text-[15px] text-white placeholder-zinc-700 resize-none outline-none bg-transparent leading-relaxed"
              />
              <div className="flex items-center justify-between mt-4 pt-3.5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 text-[11px] text-zinc-700">
                  <span className="w-2 h-2 rounded-full" style={{ background: "rgba(52,211,153,0.5)" }} />
                  Wallet: 10.00 USDC · Base
                </div>
                <button
                  onClick={handleRun}
                  disabled={!task.trim()}
                  className="btn-violet px-6 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                  Run Orchestrator →
                </button>
              </div>
            </div>

            {/* Example tasks */}
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_TASKS.map(ex => (
                <button key={ex} onClick={() => setTask(ex)}
                  className="text-[11px] text-zinc-600 px-3 py-1.5 rounded-full text-left transition-all duration-200 hover:text-violet-300"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Running / Done view */}
        {(running || done) && (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">

            {/* Left: Wallet + Transactions */}
            <div className="space-y-4">

              {/* Wallet card */}
              <div className="rounded-[18px] p-5"
                style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Orchestrator Wallet</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full text-emerald-400 font-mono"
                    style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
                    Base
                  </span>
                </div>
                <div className="mt-3 mb-1">
                  <span className="text-4xl font-bold font-mono tracking-tight"
                    style={{ color: walletBalance > 5 ? "#fff" : walletBalance > 2 ? "#fbbf24" : "#f87171" }}>
                    {walletBalance.toFixed(2)}
                  </span>
                  <span className="text-zinc-500 text-lg ml-2">USDC</span>
                </div>
                <div className="w-full rounded-full h-1 mt-3 overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(walletBalance / 10) * 100}%`,
                      background: walletBalance > 5 ? "rgba(52,211,153,0.7)" : walletBalance > 2 ? "rgba(251,191,36,0.7)" : "rgba(248,113,113,0.7)"
                    }} />
                </div>
                {totalCost !== "0.00" && (
                  <p className="text-[11px] text-zinc-600 mt-2">
                    {parseFloat(totalCost).toFixed(2)} USDC committed · {plannedAgents.length} agents
                  </p>
                )}
              </div>

              {/* Agent plan */}
              {plannedAgents.length > 0 && (
                <div className="rounded-[18px] p-5"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Agents hired</p>
                  <div className="space-y-2.5">
                    {plannedAgents.map(id => {
                      const isDone = !!agentResults[id];
                      const isRunning = currentAgent === id;
                      return (
                        <div key={id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${isDone ? "bg-green-400" : isRunning ? "pulse-dot bg-violet-400" : "bg-zinc-700"}`} />
                            <span className="text-xs text-zinc-400">{agentIcons[id]} {agentNames[id] ?? id}</span>
                          </div>
                          <span className="text-[11px] font-mono" style={{ color: AGENT_COLORS[id] ?? "#71717a" }}>
                            {isDone ? "✓" : isRunning ? "●" : "·"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Transaction log */}
              {transactions.length > 0 && (
                <div className="rounded-[18px] p-5"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Transactions · Base</p>
                  <div className="space-y-3">
                    {transactions.map((tx, i) => (
                      <div key={i} className="text-xs">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-zinc-400">{tx.icon} {tx.agent}</span>
                          <span className="text-emerald-400 font-mono">-{tx.cost} USDC</span>
                        </div>
                        <div className="text-zinc-700 font-mono text-[10px] truncate">{tx.txHash}</div>
                      </div>
                    ))}
                  </div>
                  {done && stats && (
                    <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-600">Total settled</span>
                        <span className="text-emerald-300 font-mono font-bold">{stats.totalCost} USDC</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {done && (
                <div className="flex flex-col gap-2">
                  <button onClick={() => { setDone(false); setRunning(false); }}
                    className="btn-ghost px-4 py-2.5 text-sm w-full">
                    Run another task →
                  </button>
                  <Link href="/marketplace" className="text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors pt-1">
                    Browse individual agents
                  </Link>
                </div>
              )}
            </div>

            {/* Right: Execution log + Results */}
            <div className="space-y-4 min-w-0">

              {/* Task */}
              <div className="rounded-[16px] px-5 py-3.5 flex items-start gap-3"
                style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)" }}>
                <span className="text-violet-400 text-xs mt-0.5 shrink-0">Task</span>
                <p className="text-zinc-300 text-sm leading-relaxed">{task}</p>
              </div>

              {/* Execution log */}
              <div className="rounded-[18px] overflow-hidden font-mono"
                style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-2 px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                  <span className="ml-2 text-zinc-600 text-[10px]">orchestrator.log</span>
                  {running && <span className="ml-auto pulse-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />}
                </div>
                <div ref={logRef} className="p-4 space-y-1.5 text-[12px] leading-relaxed max-h-48 overflow-y-auto">
                  {logLines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                  {running && logLines.length === 0 && (
                    <span className="text-zinc-600">Initializing orchestrator…</span>
                  )}
                </div>
              </div>

              {/* Agent result cards */}
              {Object.keys(agentResults).length > 0 && (
                <div className="space-y-3">
                  {Object.entries(agentResults).map(([id, text]) => (
                    <AgentResultCard
                      key={id}
                      agentId={id}
                      agentName={agentNames[id] ?? id}
                      icon={agentIcons[id] ?? "◈"}
                      text={text}
                      color={AGENT_COLORS[id] ?? "rgba(255,255,255,0.5)"}
                      isStreaming={currentAgent === id}
                    />
                  ))}
                </div>
              )}

              {/* Synthesis */}
              {synthesis && (
                <div className="rounded-[20px] overflow-hidden"
                  style={{ border: "1px solid rgba(124,58,237,0.25)", boxShadow: "0 24px 64px rgba(124,58,237,0.08)" }}>
                  <div className="flex items-center gap-2 px-6 py-4"
                    style={{ background: "rgba(124,58,237,0.06)", borderBottom: "1px solid rgba(124,58,237,0.15)" }}>
                    <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" style={{ animationPlayState: done ? "paused" : "running" }} />
                    <span className="text-xs text-zinc-400 font-medium">
                      {done ? "Synthesis complete" : "Synthesizing…"}
                    </span>
                    {done && stats && (
                      <span className="ml-auto text-xs text-emerald-400 font-mono">{stats.totalCost} USDC total</span>
                    )}
                  </div>
                  <div ref={synthRef} className="p-6 md:p-8" style={{ background: "rgba(0,0,0,0.4)" }}>
                    {renderProse(synthesis)}
                    {!done && <span className="cursor" />}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentResultCard({ agentId, agentName, icon, text, color, isStreaming }: {
  agentId: string; agentName: string; icon: string; text: string; color: string; isStreaming: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = text.slice(0, 220).replace(/\*\*/g, "").trim();

  return (
    <div className="rounded-[18px] overflow-hidden transition-all duration-300"
      style={{ border: `1px solid rgba(255,255,255,0.07)`, background: "rgba(255,255,255,0.02)" }}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left">
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <div>
            <p className="text-sm font-medium text-zinc-300">{agentName}</p>
            {!expanded && (
              <p className="text-xs text-zinc-600 mt-0.5 truncate max-w-xs">{preview}…</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 ml-4">
          {isStreaming && <span className="pulse-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />}
          {!isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />}
          <span className="text-zinc-700 text-xs">{expanded ? "↑" : "↓"}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-5 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="text-[13px] text-zinc-500 leading-[1.8]">
            {text.split(/\n\n+/).filter(p => p.trim()).map((p, i) => (
              <p key={i} className="mb-3">{p.replace(/\*\*/g, "")}</p>
            ))}
            {isStreaming && <span className="cursor" />}
          </div>
        </div>
      )}
    </div>
  );
}

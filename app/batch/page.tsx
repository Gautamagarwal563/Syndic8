"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Logo from "../components/Logo";
import CursorGlow from "../components/CursorGlow";

const AGENTS = [
  { id: "due-diligence",       name: "Due Diligence",       icon: "📊", price: 2.00, color: "rgba(16,185,129,0.12)",  hint: "One company per line: Perplexity AI, Mistral AI, ElevenLabs…" },
  { id: "web-research",        name: "Web Research",         icon: "🔍", price: 0.50, color: "rgba(99,102,241,0.12)", hint: "One question per line: AI agent market 2025, Latest Claude news…" },
  { id: "competitor-analysis", name: "Competitor Analysis",  icon: "⚔️", price: 1.50, color: "rgba(239,68,68,0.1)",   hint: "One company per line: Linear, Perplexity AI, Cursor…" },
  { id: "lead-enrichment",     name: "Lead Enrichment",      icon: "🎯", price: 0.25, color: "rgba(245,158,11,0.1)",  hint: "One person per line: Sam Altman, OpenAI — Garry Tan, YC…" },
  { id: "investor-research",   name: "Investor Research",    icon: "💼", price: 1.00, color: "rgba(59,130,246,0.1)",  hint: "One investor per line: Sequoia Capital, a16z, Garry Tan…" },
  { id: "startup-validator",   name: "Startup Validator",    icon: "🚀", price: 0.75, color: "rgba(168,85,247,0.12)", hint: "One idea per line: AI agent marketplace, B2B Slack analytics…" },
  { id: "roast-startup",       name: "Roast My Startup",     icon: "🔥", price: 0.50, color: "rgba(251,146,60,0.12)", hint: "One idea per line: Uber for dog walking, AI therapist for founders…" },
];

type BatchItem = {
  id: string;
  input: string;
  status: "pending" | "running" | "done" | "error";
  result: string;
};

export default function BatchPage() {
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]);
  const [rawInput, setRawInput] = useState("");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsedInputs = rawInput
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const estimatedCost = (parsedInputs.length * selectedAgent.price).toFixed(2);
  const completedCount = items.filter(i => i.status === "done").length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const lines = text.split(/[\r\n]+/).map(l => {
        // strip CSV quotes and take first column
        return l.replace(/^"(.*)".*$/, "$1").trim();
      }).filter(Boolean);
      setRawInput(lines.join("\n"));
    };
    reader.readAsText(file);
  }

  async function handleRun() {
    if (!parsedInputs.length || running) return;

    const initialItems: BatchItem[] = parsedInputs.map((input, i) => ({
      id: `item-${i}`,
      input,
      status: "pending",
      result: "",
    }));

    setItems(initialItems);
    setRunning(true);
    setDone(false);
    setExpandedId(null);
    setCurrentIndex(0);

    // Run sequentially, streaming each
    for (let i = 0; i < initialItems.length; i++) {
      setCurrentIndex(i);

      setItems(prev => prev.map((item, idx) =>
        idx === i ? { ...item, status: "running" } : item
      ));

      try {
        const res = await fetch(`/api/agents/${selectedAgent.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: initialItems[i].input }),
        });

        if (!res.ok) throw new Error("failed");

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;
          fullText += decoder.decode(value, { stream: true });

          const captured = fullText;
          setItems(prev => prev.map((item, idx) =>
            idx === i ? { ...item, result: captured } : item
          ));
        }

        setItems(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: "done", result: fullText } : item
        ));

      } catch {
        setItems(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: "error", result: "Agent failed. Try again." } : item
        ));
      }
    }

    setRunning(false);
    setDone(true);
  }

  function handleReset() {
    setItems([]);
    setDone(false);
    setRunning(false);
    setExpandedId(null);
    setCurrentIndex(0);
  }

  function downloadCSV() {
    const rows = [
      ["Input", "Result", "Status"],
      ...items.map(item => [
        `"${item.input.replace(/"/g, '""')}"`,
        `"${item.result.replace(/\*\*/g, "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
        item.status,
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `syndic8-batch-${selectedAgent.id}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadMarkdown() {
    const lines = items
      .filter(i => i.status === "done")
      .map(item =>
        `## ${item.input}\n\n${item.result}\n\n---\n`
      );
    const md = `# Syndic8 Batch — ${selectedAgent.name}\n\n${lines.join("\n")}`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `syndic8-batch-${selectedAgent.id}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyResult(result: string) {
    navigator.clipboard.writeText(result);
  }

  const showSetup = !running && !done;

  return (
    <div className="min-h-screen bg-[#060608] text-white overflow-hidden">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="blob blob-1" style={{ top: "-200px", left: "15%", opacity: 0.2 }} />
        <div className="blob blob-2" style={{ bottom: "0", right: "10%", opacity: 0.15 }} />
      </div>
      <CursorGlow />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-8 py-4"
        style={{ background: "rgba(6,6,8,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Logo />
        <div className="flex items-center gap-4 md:gap-6 text-sm text-zinc-500">
          <Link href="/marketplace" className="hover:text-white transition-colors hidden sm:block">Marketplace</Link>
          <span className="text-white font-medium hidden sm:block">Batch</span>
          <Link href="/" className="btn-ghost px-4 py-1.5 text-sm">Home</Link>
        </div>
      </nav>

      <div className="relative max-w-4xl mx-auto px-4 md:px-6 pt-28 pb-24">

        {/* Header */}
        <div className="mb-10">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Batch Mode</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-[-0.04em] mb-3">
            10 reports.<br />10 minutes.
          </h1>
          <p className="text-zinc-500 text-[15px]">
            Pick an agent, paste your list, run. Get every result in parallel — export as CSV or Markdown.
          </p>
        </div>

        {showSetup && (
          <>
            {/* Agent selector */}
            <div className="mb-6">
              <p className="text-xs text-zinc-600 uppercase tracking-widest font-mono mb-3">1 · Pick an agent</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {AGENTS.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className="rounded-[16px] p-4 text-left transition-all duration-200"
                    style={{
                      background: selectedAgent.id === agent.id ? agent.color : "rgba(255,255,255,0.02)",
                      border: selectedAgent.id === agent.id
                        ? "1px solid rgba(255,255,255,0.15)"
                        : "1px solid rgba(255,255,255,0.06)",
                    }}>
                    <div className="text-xl mb-2">{agent.icon}</div>
                    <div className="text-xs font-medium text-zinc-200 leading-tight mb-1">{agent.name}</div>
                    <div className="text-[10px] text-zinc-600 font-mono">${agent.price.toFixed(2)} / run</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-zinc-600 uppercase tracking-widest font-mono">2 · Your inputs — one per line</p>
                <div className="flex items-center gap-2">
                  <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleCSV} className="hidden" />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="text-xs text-zinc-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    Upload CSV
                  </button>
                </div>
              </div>
              <div className="rounded-[18px] overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <textarea
                  value={rawInput}
                  onChange={e => setRawInput(e.target.value)}
                  placeholder={selectedAgent.hint}
                  rows={8}
                  className="w-full p-5 text-sm text-white placeholder-zinc-700 resize-none outline-none bg-transparent leading-relaxed"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                />
                <div className="flex items-center justify-between px-5 py-3"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
                  <div className="text-xs text-zinc-600">
                    {parsedInputs.length > 0
                      ? <><span className="text-white">{parsedInputs.length}</span> inputs · <span className="text-white">{selectedAgent.icon} {selectedAgent.name}</span> · est. <span className="text-violet-300">${estimatedCost}</span></>
                      : "Paste your list above"}
                  </div>
                  <button
                    onClick={handleRun}
                    disabled={parsedInputs.length === 0}
                    className="btn-violet px-6 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                    Run Batch →
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Results */}
        {(running || done) && (
          <div>
            {/* Progress bar + stats */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-medium">
                    {done ? `${completedCount} of ${items.length} complete` : `Running ${currentIndex + 1} of ${items.length}…`}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">{selectedAgent.icon} {selectedAgent.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {done && (
                  <>
                    <button onClick={downloadCSV}
                      className="text-xs px-4 py-2 rounded-xl transition-colors hover:text-white text-zinc-400"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      Download CSV
                    </button>
                    <button onClick={downloadMarkdown}
                      className="text-xs px-4 py-2 rounded-xl transition-colors hover:text-white text-zinc-400"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      Download .md
                    </button>
                    <button onClick={handleReset}
                      className="btn-ghost px-4 py-2 text-xs">
                      New batch →
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 rounded-full mb-6 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: done ? "rgba(52,211,153,0.7)" : "rgba(124,58,237,0.7)" }} />
            </div>

            {/* Items */}
            <div className="space-y-3">
              {items.map((item, idx) => {
                const isExpanded = expandedId === item.id;
                const isRunning = item.status === "running";
                const isDone = item.status === "done";
                const isError = item.status === "error";
                const isPending = item.status === "pending";

                return (
                  <div key={item.id}
                    className="rounded-[18px] overflow-hidden transition-all duration-300"
                    style={{
                      border: isRunning
                        ? "1px solid rgba(124,58,237,0.3)"
                        : isDone
                        ? "1px solid rgba(255,255,255,0.08)"
                        : "1px solid rgba(255,255,255,0.05)",
                      background: isRunning
                        ? "rgba(124,58,237,0.05)"
                        : "rgba(255,255,255,0.02)",
                    }}>

                    {/* Row header */}
                    <button
                      onClick={() => isDone && setExpandedId(isExpanded ? null : item.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left"
                      disabled={!isDone}>
                      {/* Index */}
                      <span className="text-xs font-mono text-zinc-700 w-5 shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>

                      {/* Status dot */}
                      <span className="shrink-0">
                        {isPending && <span className="w-2 h-2 rounded-full bg-zinc-700 inline-block" />}
                        {isRunning && <span className="pulse-dot w-2 h-2 rounded-full bg-violet-400 inline-block" />}
                        {isDone && <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />}
                        {isError && <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />}
                      </span>

                      {/* Input */}
                      <span className="text-sm font-medium flex-1 min-w-0 truncate"
                        style={{ color: isPending ? "#52525b" : "#fff" }}>
                        {item.input}
                      </span>

                      {/* Preview */}
                      {isDone && !isExpanded && (
                        <span className="text-xs text-zinc-600 max-w-xs truncate hidden md:block">
                          {item.result.replace(/\*\*/g, "").slice(0, 80)}…
                        </span>
                      )}

                      {isRunning && (
                        <span className="text-xs text-zinc-500 hidden md:block">
                          {item.result
                            ? item.result.replace(/\*\*/g, "").slice(0, 60) + "…"
                            : "Thinking…"}
                        </span>
                      )}

                      {/* Actions */}
                      {isDone && (
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <button
                            onClick={e => { e.stopPropagation(); copyResult(item.result); }}
                            className="text-[11px] text-zinc-600 hover:text-white transition-colors px-2 py-1 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.04)" }}>
                            Copy
                          </button>
                          <span className="text-zinc-700 text-xs">{isExpanded ? "↑" : "↓"}</span>
                        </div>
                      )}
                    </button>

                    {/* Expanded result */}
                    {isExpanded && isDone && (
                      <div className="px-5 pb-6 pt-2"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-[14px] text-zinc-400 leading-[1.8]">
                          {item.result.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                            <p key={i} className="mb-4">
                              {para.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
                                if (part.startsWith("**") && part.endsWith("**")) {
                                  const inner = part.slice(2, -2);
                                  return <span key={j} className="text-white font-semibold">{inner} </span>;
                                }
                                return <span key={j}>{part}</span>;
                              })}
                            </p>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Link href={`/agent/${selectedAgent.id}?q=${encodeURIComponent(item.input)}`}
                            className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                            Run again in full agent →
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Streaming preview while running */}
                    {isRunning && item.result && (
                      <div className="px-5 pb-4 pt-1"
                        style={{ borderTop: "1px solid rgba(124,58,237,0.12)" }}>
                        <p className="text-xs text-zinc-600 leading-relaxed">
                          {item.result.replace(/\*\*/g, "").slice(0, 200)}
                          <span className="cursor" />
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Done summary */}
            {done && (
              <div className="mt-8 rounded-[18px] p-6 text-center"
                style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)" }}>
                <p className="text-emerald-300 font-semibold text-lg mb-1">
                  {completedCount} reports complete
                </p>
                <p className="text-zinc-600 text-sm mb-4">
                  {selectedAgent.icon} {selectedAgent.name} · ${(completedCount * selectedAgent.price).toFixed(2)} total
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button onClick={downloadCSV}
                    className="btn-white px-6 py-2.5 text-sm">
                    Download CSV →
                  </button>
                  <button onClick={downloadMarkdown}
                    className="btn-ghost px-6 py-2.5 text-sm">
                    Download .md
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";

const agentData: Record<string, {
  name: string;
  description: string;
  icon: string;
  price: string;
  placeholder: string;
  inputLabel: string;
  speed: string;
}> = {
  "web-research": {
    name: "Web Research Agent",
    description: "Give it any topic or question. It searches the web and returns a structured, sourced report.",
    icon: "🔍",
    price: "$0.50",
    placeholder: "e.g. What is the current state of the AI agent market in 2025?",
    inputLabel: "What do you want researched?",
    speed: "~8 seconds",
  },
  "due-diligence": {
    name: "Due Diligence Agent",
    description: "Input a company name. Get founders, funding, news, competitors, and risk flags.",
    icon: "📊",
    price: "$2.00",
    placeholder: "e.g. Perplexity AI",
    inputLabel: "Company name",
    speed: "~20 seconds",
  },
  "lead-enrichment": {
    name: "Lead Enrichment Agent",
    description: "Drop in a name and company. Get context, role, and specific outreach angles.",
    icon: "🎯",
    price: "$0.25",
    placeholder: "e.g. Sam Altman, OpenAI",
    inputLabel: "Name and company",
    speed: "~6 seconds",
  },
};

export default function AgentPage() {
  const params = useParams();
  const id = params.id as string;
  const agent = agentData[id];

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!agent) {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 mb-4">Agent not found.</p>
          <Link href="/marketplace" className="text-violet-400 hover:underline text-sm">← Back to marketplace</Link>
        </div>
      </div>
    );
  }

  async function runAgent() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult(data.result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-hidden">

      {/* Background */}
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: "600px",
          height: "300px",
          background: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.1) 0%, transparent 70%)",
        }}
      />

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{
          background: "rgba(8,8,8,0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Link href="/" className="text-[15px] font-semibold tracking-tight">Syndic8</Link>
        <Link href="/marketplace" className="text-sm text-zinc-500 hover:text-white transition-colors">
          ← Marketplace
        </Link>
      </nav>

      <div className="relative max-w-2xl mx-auto px-6 pt-32 pb-20">

        {/* Agent header */}
        <div className="mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {agent.icon}
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{agent.name}</h1>
          <p className="text-zinc-500 text-[15px] mb-3">{agent.description}</p>
          <div className="flex items-center gap-3 text-xs text-zinc-600">
            <span>{agent.price} per task</span>
            <span>·</span>
            <span>{agent.speed}</span>
            <span>·</span>
            <span className="text-green-500">live</span>
          </div>
        </div>

        {/* Input card */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <label className="block text-xs text-zinc-500 font-medium mb-3 uppercase tracking-wider">
            {agent.inputLabel}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runAgent(); }}
            placeholder={agent.placeholder}
            rows={3}
            className="w-full text-sm text-white placeholder-zinc-700 resize-none outline-none bg-transparent leading-relaxed"
          />
          <div
            className="flex items-center justify-between mt-4 pt-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span className="text-xs text-zinc-700">⌘ + Enter to run</span>
            <button
              onClick={runAgent}
              disabled={loading || !input.trim()}
              className="btn-primary px-5 py-2 text-sm font-medium text-black disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? "Running..." : `Run · ${agent.price}`}
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div
            className="rounded-2xl p-6"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-violet-500"
                    style={{ animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
              <span className="text-sm text-zinc-500">Agent is working…</span>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Result header */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2 text-xs text-green-400">
                <span>✓</span>
                <span>Complete</span>
              </div>
              <button
                onClick={handleCopy}
                className="text-xs text-zinc-600 hover:text-white transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Result body */}
            <div className="p-5" style={{ background: "rgba(0,0,0,0.3)" }}>
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans">
                {result}
              </pre>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="rounded-2xl p-5"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
          >
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

      </div>
    </div>
  );
}

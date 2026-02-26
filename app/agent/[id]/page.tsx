"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { useParams } from "next/navigation";

const agentData: Record<string, {
  name: string;
  description: string;
  icon: string;
  price: string;
  placeholder: string;
  inputLabel: string;
  speed: string;
  examples: string[];
  color: string;
}> = {
  "web-research": {
    name: "Web Research Agent",
    description: "Give it any topic or question. Searches the web and returns a structured, sourced report.",
    icon: "🔍",
    price: "$0.50",
    placeholder: "e.g. What is the current state of the AI agent market in 2025?",
    inputLabel: "What do you want researched?",
    speed: "~8s",
    examples: ["AI agent market in 2025", "Latest Anthropic Claude updates", "Best YC W25 startups"],
    color: "rgba(99,102,241,0.2)",
  },
  "due-diligence": {
    name: "Due Diligence Agent",
    description: "Input a company name. Get founders, funding, news, competitors, and risk flags.",
    icon: "📊",
    price: "$2.00",
    placeholder: "e.g. Perplexity AI",
    inputLabel: "Company name",
    speed: "~20s",
    examples: ["Perplexity AI", "Mistral AI", "ElevenLabs"],
    color: "rgba(16,185,129,0.15)",
  },
  "lead-enrichment": {
    name: "Lead Enrichment Agent",
    description: "Drop in a name and company. Get context, role, and specific outreach angles.",
    icon: "🎯",
    price: "$0.25",
    placeholder: "e.g. Sam Altman, OpenAI",
    inputLabel: "Name and company",
    speed: "~6s",
    examples: ["Sam Altman, OpenAI", "Garry Tan, YC", "Jensen Huang, NVIDIA"],
    color: "rgba(245,158,11,0.15)",
  },
};

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-base font-semibold text-white mt-6 mb-2 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-sm font-semibold text-zinc-200 mt-4 mb-1.5">{line.slice(4)}</h3>);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(<p key={i} className="text-sm font-semibold text-zinc-200 mb-1">{line.slice(2, -2)}</p>);
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      elements.push(
        <div key={i} className="flex items-start gap-2 mb-1.5">
          <span className="text-violet-500 mt-0.5 shrink-0 text-xs">●</span>
          <span className="text-sm text-zinc-400 leading-relaxed">{formatInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)?.[1];
      elements.push(
        <div key={i} className="flex items-start gap-2.5 mb-1.5">
          <span className="text-violet-500 text-xs font-mono mt-0.5 shrink-0 w-4">{num}.</span>
          <span className="text-sm text-zinc-400 leading-relaxed">{formatInline(line.replace(/^\d+\. /, ""))}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-sm text-zinc-400 leading-relaxed mb-1">{formatInline(line)}</p>);
    }
    i++;
  }
  return elements;
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="text-zinc-200 font-semibold">{p.slice(2, -2)}</strong>
      : p
  );
}

export default function AgentPage() {
  const params = useParams();
  const id = params.id as string;
  const agent = agentData[id];

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  if (!agent) {
    return (
      <div className="min-h-screen bg-[#060608] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 mb-4 text-sm">Agent not found.</p>
          <Link href="/marketplace" className="text-violet-400 hover:underline text-sm">← Back to marketplace</Link>
        </div>
      </div>
    );
  }

  async function runAgent() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setIsStreaming(true);
    setResult("");
    setError(null);

    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      // Stream the response
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setResult(fullText);
        // Scroll to bottom
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 50);
      }

      setIsStreaming(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setIsStreaming(false);
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
    <div className="min-h-screen bg-[#060608] text-white overflow-hidden">

      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed pointer-events-none overflow-hidden" style={{ inset: 0 }}>
        <div className="blob" style={{
          top: "-200px", left: "20%", width: "500px", height: "500px", opacity: 0.3,
          background: `radial-gradient(circle, ${agent.color} 0%, transparent 70%)`,
          borderRadius: "50%", filter: "blur(80px)", position: "absolute",
          animation: "blob1 18s ease-in-out infinite"
        }} />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: "rgba(6,6,8,0.8)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Link href="/" className="text-[15px] font-semibold tracking-tight">Syndic8</Link>
        <Link href="/marketplace" className="text-sm text-zinc-500 hover:text-white transition-colors">
          ← Marketplace
        </Link>
      </nav>

      <div className="relative max-w-2xl mx-auto px-6 pt-32 pb-24">

        {/* Agent header */}
        <div className="mb-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {agent.icon}
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.03em] mb-2">{agent.name}</h1>
          <p className="text-zinc-500 text-[15px] mb-4">{agent.description}</p>
          <div className="flex items-center gap-3 text-xs text-zinc-600">
            <span className="font-semibold text-zinc-300">{agent.price}</span>
            <span>·</span>
            <span>{agent.speed}</span>
            <span>·</span>
            <span className="text-green-400">live</span>
          </div>
        </div>

        {/* Example chips */}
        <div className="mb-5">
          <p className="text-xs text-zinc-600 mb-2">Quick examples:</p>
          <div className="flex flex-wrap gap-2">
            {agent.examples.map((ex) => (
              <button key={ex}
                onClick={() => setInput(ex)}
                className="text-xs text-zinc-500 px-3 py-1.5 rounded-full transition-all duration-200 hover:text-violet-300 hover:border-violet-500/30"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="rounded-[20px] p-5 mb-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
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
          <div className="flex items-center justify-between mt-4 pt-3.5"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-[11px] text-zinc-700">⌘ Enter to run</span>
            <button
              onClick={runAgent}
              disabled={loading || !input.trim()}
              className="btn-violet px-5 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
              {loading ? "Running..." : `Run · ${agent.price}`}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && !result && (
          <div className="rounded-[20px] p-5 mb-4"
            style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)" }}>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block"
                    style={{ animation: `pulseDot 1.2s ease-in-out ${delay}s infinite` }} />
                ))}
              </div>
              <span className="text-sm text-zinc-400">Agent is searching and thinking…</span>
            </div>
          </div>
        )}

        {/* Streaming result */}
        {result !== null && (
          <div ref={resultRef} className="rounded-[20px] overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3"
              style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 text-xs">
                {isStreaming ? (
                  <>
                    <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                    <span className="text-violet-400">Streaming…</span>
                  </>
                ) : (
                  <>
                    <span className="text-green-400">✓</span>
                    <span className="text-green-400">Complete</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!isStreaming && (
                  <button onClick={handleCopy} className="text-xs text-zinc-600 hover:text-white transition-colors">
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-6" style={{ background: "rgba(0,0,0,0.35)" }}>
              <div className="text-sm leading-relaxed">
                {renderMarkdown(result)}
                {isStreaming && <span className="cursor" />}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-[20px] p-5"
            style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

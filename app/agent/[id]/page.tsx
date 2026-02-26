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
}> = {
  "web-research": {
    name: "Web Research Agent",
    description: "Give it any topic or question. It searches the web and returns a structured, sourced report.",
    icon: "🔍",
    price: "$0.50",
    placeholder: "e.g. What is the current state of the AI agent market in 2025?",
    inputLabel: "What do you want researched?",
  },
  "due-diligence": {
    name: "Due Diligence Agent",
    description: "Input a company name. Get founders, funding, news, competitors, and risk flags.",
    icon: "📊",
    price: "$2.00",
    placeholder: "e.g. Perplexity AI",
    inputLabel: "Company name",
  },
  "lead-enrichment": {
    name: "Lead Enrichment Agent",
    description: "Drop in a name and company. Get back context, role, and outreach angles.",
    icon: "🎯",
    price: "$0.25",
    placeholder: "e.g. Sam Altman, OpenAI",
    inputLabel: "Name and company",
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

  if (!agent) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Agent not found.</p>
          <Link href="/marketplace" className="text-violet-400 hover:underline">Back to marketplace</Link>
        </div>
      </div>
    );
  }

  async function runAgent() {
    if (!input.trim()) return;
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
        <Link href="/" className="text-lg font-semibold tracking-tight">Syndic8</Link>
        <Link href="/marketplace" className="text-sm text-zinc-400 hover:text-white transition-colors">
          ← Back to marketplace
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Agent header */}
        <div className="mb-10">
          <div className="text-4xl mb-4">{agent.icon}</div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{agent.name}</h1>
          <p className="text-zinc-400 mb-4">{agent.description}</p>
          <span className="text-sm text-zinc-500">{agent.price} per task</span>
        </div>

        {/* Input */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 mb-6">
          <label className="block text-sm text-zinc-400 mb-3">{agent.inputLabel}</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={agent.placeholder}
            rows={3}
            className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 resize-none outline-none focus:border-violet-500/50 transition-colors"
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-zinc-600">Results stream back in ~10 seconds</span>
            <button
              onClick={runAgent}
              disabled={loading || !input.trim()}
              className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Running..." : `Run Agent · ${agent.price}`}
            </button>
          </div>
        </div>

        {/* Result */}
        {loading && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
            <div className="flex items-center gap-3 text-zinc-400 text-sm">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
              Agent is working...
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <span>✓</span>
                <span>Complete</span>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(result)}
                className="text-xs text-zinc-500 hover:text-white transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans">
              {result}
            </pre>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

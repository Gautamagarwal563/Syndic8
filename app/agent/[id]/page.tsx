"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import RunHistory, { useHistory, HistoryItem } from "../../components/RunHistory";
import CursorGlow from "../../components/CursorGlow";
import Logo from "../../components/Logo";

const agentData: Record<string, {
  name: string; description: string; icon: string; price: string;
  priceInt: number; placeholder: string; inputLabel: string;
  speed: string; examples: string[]; color: string;
}> = {
  "web-research": {
    name: "Web Research Agent", description: "Searches the web and returns a clean, sourced brief.",
    icon: "🔍", price: "$0.50", priceInt: 50,
    placeholder: "e.g. What is the current state of the AI agent market in 2025?",
    inputLabel: "What do you want researched?", speed: "~8s",
    examples: ["AI agent market in 2025", "Latest Anthropic Claude updates", "Best YC W25 startups"],
    color: "rgba(99,102,241,0.15)",
  },
  "due-diligence": {
    name: "Due Diligence Agent", description: "Company name in. Investor-grade brief out.",
    icon: "📊", price: "$2.00", priceInt: 200,
    placeholder: "e.g. Perplexity AI",
    inputLabel: "Company name", speed: "~20s",
    examples: ["Perplexity AI", "Mistral AI", "ElevenLabs"],
    color: "rgba(16,185,129,0.12)",
  },
  "lead-enrichment": {
    name: "Lead Enrichment Agent", description: "Name + company in. Enriched profile and outreach angles out.",
    icon: "🎯", price: "$0.25", priceInt: 25,
    placeholder: "e.g. Sam Altman, OpenAI",
    inputLabel: "Name and company", speed: "~6s",
    examples: ["Sam Altman, OpenAI", "Garry Tan, YC", "Jensen Huang, NVIDIA"],
    color: "rgba(245,158,11,0.12)",
  },
};

// ── Prose renderer ──────────────────────────────────────
function renderReport(text: string) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  return paragraphs.map((para, i) => {
    const trimmed = para.trim();
    if (trimmed.startsWith("Sources:") || trimmed.startsWith("**Sources")) {
      const urls = trimmed.replace(/\*?\*?Sources:?\*?\*?/, "").split(/\n/)
        .map(l => l.trim()).filter(l => l.startsWith("http") || l.match(/^[-\d.]\s*http/));
      return (
        <div key={i} className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Sources</p>
          <div className="flex flex-col gap-1.5">
            {urls.map((url, j) => {
              const clean = url.replace(/^[-\d.]\s*/, "").trim();
              return <a key={j} href={clean} target="_blank" rel="noopener noreferrer"
                className="text-xs text-zinc-600 hover:text-violet-400 transition-colors truncate">{clean}</a>;
            })}
            {urls.length === 0 && <p className="text-xs text-zinc-600">{trimmed.replace(/\*?\*?Sources:?\*?\*?/, "").trim()}</p>}
          </div>
        </div>
      );
    }
    return <p key={i} className="text-[15px] text-zinc-400 leading-[1.8] mb-5">{parseInline(trimmed)}</p>;
  });
}

function parseInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2);
      if (inner.match(/[.:]$/)) return <span key={i} className="text-white font-semibold">{inner}{" "}</span>;
      return <strong key={i} className="text-zinc-200 font-semibold">{inner}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Main page ───────────────────────────────────────────
export default function AgentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const agent = agentData[id];
  const { addRun } = useHistory();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "verifying" | "paid" | "failed">("idle");
  const resultRef = useRef<HTMLDivElement>(null);
  const stripeEnabled = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  // Handle Stripe redirect return
  const sessionId = searchParams.get("session_id");
  const runAgent = useCallback(async (taskInput: string) => {
    if (!taskInput.trim() || loading) return;
    setLoading(true);
    setIsStreaming(true);
    setResult("");
    setError(null);
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: taskInput }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Agent failed"); }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setResult(fullText);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
      }
      setIsStreaming(false);
      addRun({ agentId: id, agentName: agent.name, icon: agent.icon, input: taskInput, result: fullText, paid: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setIsStreaming(false);
    } finally {
      setLoading(false);
    }
  }, [id, loading, agent, addRun]);

  useEffect(() => {
    if (!sessionId) return;
    setPaymentStatus("verifying");
    fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.verified && data.input) {
          setPaymentStatus("paid");
          setInput(data.input);
          runAgent(data.input);
        } else {
          setPaymentStatus("failed");
        }
      })
      .catch(() => setPaymentStatus("failed"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function handlePay() {
    if (!input.trim()) return;

    // If Stripe not configured, run directly (demo mode)
    if (!stripeEnabled) {
      runAgent(input);
      return;
    }

    setPaying(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: id, input }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error);
    } catch {
      setError("Could not start checkout. Check Stripe keys.");
      setPaying(false);
    }
  }

  function handleSelectHistory(item: HistoryItem) {
    setInput(item.input);
    setResult(item.result);
    setIsStreaming(false);
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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

  return (
    <div className="min-h-screen bg-[#060608] text-white overflow-hidden">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed pointer-events-none" style={{ inset: 0, overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "-200px", left: "20%",
          width: "500px", height: "500px", borderRadius: "50%",
          background: `radial-gradient(circle, ${agent.color} 0%, transparent 70%)`,
          filter: "blur(80px)", opacity: 0.4,
          animation: "blob1 18s ease-in-out infinite",
        }} />
      </div>
      <CursorGlow />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: "rgba(6,6,8,0.8)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Logo />
        <Link href="/marketplace" className="text-sm text-zinc-500 hover:text-white transition-colors">← Marketplace</Link>
      </nav>

      <div className="relative max-w-2xl mx-auto px-6 pt-32 pb-24">

        {/* Agent header */}
        <div className="mb-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-5"
            style={{ background: agent.color, border: "1px solid rgba(255,255,255,0.08)" }}>
            {agent.icon}
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.03em] mb-2">{agent.name}</h1>
          <p className="text-zinc-500 text-[15px] mb-4">{agent.description}</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-white text-base">{agent.price}</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-600">{agent.speed}</span>
            <span className="text-zinc-700">·</span>
            <span className="text-green-400">live</span>
            {!stripeEnabled && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-yellow-500/70 text-[10px] font-mono">demo mode</span>
              </>
            )}
          </div>
        </div>

        {/* Payment verified banner */}
        {paymentStatus === "verifying" && (
          <div className="rounded-xl px-5 py-3 mb-5 flex items-center gap-3"
            style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
            <span className="text-sm text-zinc-400">Verifying payment…</span>
          </div>
        )}
        {paymentStatus === "paid" && (
          <div className="rounded-xl px-5 py-3 mb-5 flex items-center gap-2"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
            <span className="text-green-400 text-sm">✓</span>
            <span className="text-sm text-green-400">Payment confirmed · Running agent</span>
          </div>
        )}

        {/* History */}
        <RunHistory agentId={id} onSelect={handleSelectHistory} />

        {/* Example chips */}
        <div className="mb-5">
          <p className="text-xs text-zinc-700 mb-2">Quick examples:</p>
          <div className="flex flex-wrap gap-2">
            {agent.examples.map((ex) => (
              <button key={ex} onClick={() => setInput(ex)}
                className="text-xs text-zinc-500 px-3 py-1.5 rounded-full transition-all duration-200 hover:text-violet-300"
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
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePay(); }}
            placeholder={agent.placeholder}
            rows={3}
            className="w-full text-sm text-white placeholder-zinc-700 resize-none outline-none bg-transparent leading-relaxed"
          />
          <div className="flex items-center justify-between mt-4 pt-3.5"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-[11px] text-zinc-700">⌘ Enter to run</span>
            <button
              onClick={handlePay}
              disabled={loading || paying || !input.trim()}
              className="btn-violet px-5 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center gap-2">
              {paying ? "Redirecting to Stripe…" : loading ? "Running…" : (
                <>
                  {stripeEnabled ? "Pay & Run" : "Run"}
                  <span className="opacity-60">·</span>
                  <span>{agent.price}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stripe badge */}
        {stripeEnabled && (
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-3 h-3 text-zinc-700" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
            </svg>
            <span className="text-[10px] text-zinc-700">Secured by Stripe</span>
          </div>
        )}

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

        {/* Result */}
        {result !== null && (
          <div ref={resultRef} className="rounded-[20px] overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 text-xs">
                {isStreaming ? (
                  <><span className="pulse-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                  <span className="text-zinc-400">Writing report…</span></>
                ) : (
                  <><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  <span className="text-zinc-300 font-medium">Report ready</span></>
                )}
              </div>
              {!isStreaming && (
                <button onClick={handleCopy}
                  className="text-xs text-zinc-600 hover:text-white transition-colors">
                  {copied ? "✓ Copied" : "Copy report"}
                </button>
              )}
            </div>
            <div className="p-7" style={{ background: "rgba(0,0,0,0.3)" }}>
              {renderReport(result)}
              {isStreaming && <span className="cursor" />}
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

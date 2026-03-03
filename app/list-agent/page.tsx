"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "../components/Logo";
import CursorGlow from "../components/CursorGlow";

const CATEGORIES = ["Research", "Finance", "Sales", "Strategy", "Fundraising", "Data", "Automation", "Other"];

const EMOJI_OPTIONS = ["🤖", "🔍", "📊", "🎯", "⚔️", "💼", "🚀", "🔥", "💡", "🧠", "⚡", "🌐", "🔗", "📈", "🛡️", "🎨"];

const BENEFITS = [
  { icon: "💸", title: "Earn per run", body: "Get paid every time a human or agent runs your agent. No subscriptions — pure per-task revenue." },
  { icon: "⚡", title: "Agent-to-agent billing", body: "Autonomous agents on Syndic8 can hire and pay your agent in USDC on Base, 24/7, no human needed." },
  { icon: "🌐", title: "Instant distribution", body: "Your agent appears in the marketplace immediately after approval, discoverable by thousands of users." },
  { icon: "🔗", title: "Simple API contract", body: "Just expose a POST endpoint that streams text. We handle auth, billing, and rate limiting." },
];

export default function ListAgentPage() {
  const [form, setForm] = useState({
    name: "",
    icon: "🤖",
    description: "",
    category: "Research",
    pricePerTask: "",
    apiEndpoint: "",
    examples: ["", "", ""],
    contactEmail: "",
    website: "",
    howItWorks: "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  function update(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function updateExample(i: number, value: string) {
    setForm(prev => {
      const examples = [...prev.examples];
      examples[i] = value;
      return { ...prev, examples };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/list-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          examples: form.examples.filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong.");
        setStatus("error");
      } else {
        setStatus("done");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

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
        <div className="flex items-center gap-4 text-sm text-zinc-500">
          <Link href="/marketplace" className="hover:text-white transition-colors hidden sm:block">← Marketplace</Link>
          <Link href="/orchestrate" className="hover:text-white transition-colors hidden md:flex items-center gap-1.5">
            <span className="pulse-dot w-1 h-1 rounded-full bg-violet-500 inline-block" />Orchestrator
          </Link>
        </div>
      </nav>

      <div className="relative max-w-4xl mx-auto px-6 pt-32 pb-28">

        {status === "done" ? (
          /* ── Success state ── */
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6"
              style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
              ✓
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.04em] mb-3">Application received.</h2>
            <p className="text-zinc-500 text-[15px] max-w-sm mx-auto mb-8">
              We&apos;ll review your agent and reach out within 48 hours. Once approved, it goes live on the marketplace immediately.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href="/marketplace" className="btn-ghost px-6 py-2.5 text-sm">Browse Marketplace →</Link>
              <Link href="/orchestrate" className="btn-violet px-6 py-2.5 text-sm">Try Orchestrator →</Link>
            </div>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="mb-14">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs text-violet-300"
                style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)" }}>
                <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                For developers · Agent Economy
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-[-0.05em] leading-[0.95] mb-5">
                List your agent.<br />
                <span className="gradient-text">Earn per run.</span>
              </h1>
              <p className="text-zinc-500 text-[16px] max-w-lg leading-relaxed">
                Build an agent, expose a streaming API, and list it on Syndic8.
                Earn every time a human pays with Stripe — or another agent pays you in USDC on Base.
              </p>
            </div>

            {/* ── Benefits grid ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-14">
              {BENEFITS.map(b => (
                <div key={b.title} className="rounded-[16px] p-5"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-2xl mb-3">{b.icon}</div>
                  <h3 className="font-semibold text-[13px] mb-1.5">{b.title}</h3>
                  <p className="text-xs text-zinc-600 leading-relaxed">{b.body}</p>
                </div>
              ))}
            </div>

            {/* ── API contract callout ── */}
            <div className="rounded-[20px] overflow-hidden mb-14"
              style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 px-5 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                <span className="ml-2 text-zinc-600 text-[10px]">your-agent/route.ts</span>
              </div>
              <div className="p-5 md:p-6 font-mono text-[12px] leading-relaxed space-y-1">
                <p><span className="text-violet-400">export async function</span> <span className="text-yellow-300">POST</span><span className="text-zinc-400">(req: Request) &#123;</span></p>
                <p className="pl-4"><span className="text-violet-400">const</span> <span className="text-blue-300">&#123; input &#125;</span> <span className="text-zinc-500">= await</span> <span className="text-zinc-300">req.json()</span></p>
                <p className="pl-4 text-zinc-600">// do your AI work...</p>
                <p className="pl-4"><span className="text-violet-400">return new</span> <span className="text-yellow-300">Response</span><span className="text-zinc-400">(</span><span className="text-orange-300">stream</span><span className="text-zinc-400">, &#123;</span></p>
                <p className="pl-8"><span className="text-green-300">headers</span><span className="text-zinc-500">: &#123;</span> <span className="text-orange-300">&quot;Content-Type&quot;</span><span className="text-zinc-500">:</span> <span className="text-orange-300">&quot;text/plain; charset=utf-8&quot;</span> <span className="text-zinc-500">&#125;</span></p>
                <p className="pl-4"><span className="text-zinc-500">&#125;)</span></p>
                <p><span className="text-zinc-500">&#125;</span></p>
                <div className="mt-4 pt-4 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-zinc-600">// That&apos;s it. Syndic8 handles billing, rate limiting, and discovery.</p>
                </div>
              </div>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Agent identity */}
              <div className="rounded-[20px] p-6 md:p-7 space-y-5"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Agent identity</p>

                <div className="flex gap-4 items-start">
                  {/* Icon picker */}
                  <div className="relative">
                    <button type="button"
                      onClick={() => setShowEmojiPicker(v => !v)}
                      className="w-14 h-14 rounded-2xl text-2xl flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-105"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      {form.icon}
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute top-16 left-0 z-20 rounded-[16px] p-3 grid grid-cols-4 gap-2"
                        style={{ background: "rgba(15,15,20,0.98)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
                        {EMOJI_OPTIONS.map(e => (
                          <button key={e} type="button"
                            onClick={() => { update("icon", e); setShowEmojiPicker(false); }}
                            className="w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-colors hover:bg-white/10">
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1">
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">Agent name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => update("name", e.target.value)}
                      placeholder="e.g. Patent Research Agent"
                      required
                      className="w-full text-sm text-white placeholder-zinc-700 outline-none bg-transparent leading-relaxed py-2 px-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">Description * <span className="normal-case text-zinc-700 font-normal">(one sentence, what it does)</span></label>
                  <textarea
                    value={form.description}
                    onChange={e => update("description", e.target.value)}
                    placeholder="e.g. Patent number in. Plain-English summary and prior art breakdown out."
                    rows={2}
                    required
                    className="w-full text-sm text-white placeholder-zinc-700 outline-none bg-transparent leading-relaxed resize-none py-2 px-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>

                {/* Category + Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">Category *</label>
                    <select
                      value={form.category}
                      onChange={e => update("category", e.target.value)}
                      className="w-full text-sm text-white outline-none py-2 px-3 rounded-xl appearance-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">Price per task (USD) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={form.pricePerTask}
                        onChange={e => update("pricePerTask", e.target.value)}
                        placeholder="0.50"
                        required
                        className="w-full text-sm text-white placeholder-zinc-700 outline-none bg-transparent pl-7 py-2 pr-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* API & Examples */}
              <div className="rounded-[20px] p-6 md:p-7 space-y-5"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">API & examples</p>

                <div>
                  <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">API endpoint URL *</label>
                  <input
                    type="url"
                    value={form.apiEndpoint}
                    onChange={e => update("apiEndpoint", e.target.value)}
                    placeholder="https://your-api.com/api/agents/your-agent"
                    required
                    className="w-full text-sm text-white placeholder-zinc-700 outline-none bg-transparent py-2 px-3 rounded-xl font-mono"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <p className="text-[11px] text-zinc-700 mt-1.5">Must accept POST with JSON body <span className="font-mono">&#123; input: string &#125;</span> and stream plain text.</p>
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">Example inputs <span className="normal-case text-zinc-700 font-normal">(shown to users)</span></label>
                  <div className="space-y-2">
                    {form.examples.map((ex, i) => (
                      <input
                        key={i}
                        type="text"
                        value={ex}
                        onChange={e => updateExample(i, e.target.value)}
                        placeholder={`Example ${i + 1}${i === 0 ? " *" : ""}`}
                        required={i === 0}
                        className="w-full text-sm text-white placeholder-zinc-700 outline-none bg-transparent py-2 px-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">How it works <span className="normal-case text-zinc-700 font-normal">(optional — 1-2 sentences)</span></label>
                  <textarea
                    value={form.howItWorks}
                    onChange={e => update("howItWorks", e.target.value)}
                    placeholder="e.g. Uses PubMed + GPT-4 to parse patents, then writes a plain-English summary with prior art citations."
                    rows={2}
                    className="w-full text-sm text-white placeholder-zinc-700 outline-none bg-transparent leading-relaxed resize-none py-2 px-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
              </div>

              {/* Developer contact */}
              <div className="rounded-[20px] p-6 md:p-7 space-y-4"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Developer contact</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">Email *</label>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={e => update("contactEmail", e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full text-sm text-white placeholder-zinc-700 outline-none bg-transparent py-2 px-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">Website / GitHub <span className="normal-case text-zinc-700 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={form.website}
                      onChange={e => update("website", e.target.value)}
                      placeholder="https://github.com/you/your-agent"
                      className="w-full text-sm text-white placeholder-zinc-700 outline-none bg-transparent py-2 px-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Error */}
              {status === "error" && (
                <div className="rounded-[16px] px-5 py-3"
                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <p className="text-red-400 text-sm">{errorMsg}</p>
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-zinc-700 max-w-xs">
                  We review every submission and reply within 48h. Once approved, your agent goes live with full billing enabled.
                </div>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="btn-violet px-7 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none ml-6 shrink-0">
                  {status === "loading" ? "Submitting…" : "Submit agent →"}
                </button>
              </div>
            </form>

            {/* ── Bottom — existing agents promo ── */}
            <div className="mt-16 rounded-[20px] p-8 text-center"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Already live</p>
              <h3 className="font-semibold text-lg mb-2">See what&apos;s already on Syndic8</h3>
              <p className="text-zinc-500 text-sm mb-5 max-w-xs mx-auto">
                Browse the marketplace to see the format, pricing, and examples from existing agents.
              </p>
              <Link href="/marketplace" className="btn-ghost px-5 py-2.5 text-sm inline-block">Browse agents →</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

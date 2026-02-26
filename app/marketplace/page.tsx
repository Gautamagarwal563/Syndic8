"use client";

import Link from "next/link";
import { useState } from "react";
import Logo from "../components/Logo";

const agents = [
  {
    id: "web-research",
    name: "Web Research Agent",
    description: "Give it any question or topic. Returns a clean, sourced brief with key context — not a wall of links.",
    tags: ["Research"],
    price: "$0.50", priceUnit: "per task", icon: "🔍", speed: "~8s",
    examples: ["AI agent market in 2025", "Latest Anthropic news", "Best YC W25 startups"],
    badge: null,
  },
  {
    id: "due-diligence",
    name: "Due Diligence Agent",
    description: "Company name in. Investor-grade brief out — founders, funding, news, competitors, and risk flags.",
    tags: ["Finance", "Research"],
    price: "$2.00", priceUnit: "per report", icon: "📊", speed: "~20s",
    examples: ["Perplexity AI", "Mistral AI", "ElevenLabs"],
    badge: null,
  },
  {
    id: "lead-enrichment",
    name: "Lead Enrichment Agent",
    description: "Name and company in. Enriched profile out — role, background, and actual outreach angles, not generic tips.",
    tags: ["Sales"],
    price: "$0.25", priceUnit: "per lead", icon: "🎯", speed: "~6s",
    examples: ["Sam Altman, OpenAI", "Garry Tan, YC", "Jensen Huang, NVIDIA"],
    badge: null,
  },
  {
    id: "competitor-analysis",
    name: "Competitor Analysis Agent",
    description: "Drop in a company or product. Get a sharp breakdown of who they compete with, where they win, and where they're exposed.",
    tags: ["Strategy", "Research"],
    price: "$1.50", priceUnit: "per report", icon: "⚔️", speed: "~18s",
    examples: ["Linear vs Jira", "Perplexity AI", "Cursor"],
    badge: "New",
  },
  {
    id: "investor-research",
    name: "Investor Research Agent",
    description: "Enter a VC firm or investor name. Get their thesis, portfolio, check size, and what they actually want to fund.",
    tags: ["Finance", "Fundraising"],
    price: "$1.00", priceUnit: "per brief", icon: "💼", speed: "~15s",
    examples: ["Sequoia Capital", "Garry Tan", "a16z"],
    badge: "New",
  },
  {
    id: "startup-validator",
    name: "Startup Idea Validator",
    description: "Describe your startup idea. Get brutal, honest YC-style feedback on the market, competition, risks, and whether to pursue.",
    tags: ["Strategy", "Fundraising"],
    price: "$0.75", priceUnit: "per validation", icon: "🚀", speed: "~12s",
    examples: ["AI agent marketplace", "B2B Slack analytics", "No-code Shopify builder"],
    badge: "New",
  },
];

const FILTERS = ["All", "Research", "Finance", "Sales", "Strategy", "Fundraising"];

const trending = [
  "Perplexity AI due diligence",
  "a16z investor thesis",
  "Cursor vs Copilot competitors",
  "AI agent market 2025",
  "Sequoia Capital portfolio",
  "Validate: AI hiring platform",
];

export default function Marketplace() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = agents.filter(a => {
    const matchesFilter = activeFilter === "All" || a.tags.includes(activeFilter);
    const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#060608] text-white overflow-hidden">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="blob blob-1" style={{ top: "-200px", left: "15%", opacity: 0.3 }} />
        <div className="blob blob-2" style={{ bottom: "0", right: "10%", opacity: 0.2 }} />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: "rgba(6,6,8,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Logo />
        <div className="flex items-center gap-7 text-sm text-zinc-500">
          <span className="text-white font-medium text-sm">Marketplace</span>
          <Link href="/demo" className="hover:text-white transition-colors flex items-center gap-1.5">
            <span className="pulse-dot w-1 h-1 rounded-full bg-violet-500 inline-block" />Demo
          </Link>
          <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
          <button className="btn-ghost px-4 py-1.5 text-sm">List Your Agent</button>
        </div>
      </nav>

      <div className="relative max-w-4xl mx-auto px-6 pt-32 pb-24">

        {/* Header */}
        <div className="mb-10">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Marketplace</p>
          <h1 className="text-5xl font-bold tracking-[-0.04em] mb-3">
            {agents.length} agents,<br />ready to run.
          </h1>
          <p className="text-zinc-500 text-[15px]">Pay per task. Results in seconds. No account needed.</p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">⌕</div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agents…"
            className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white placeholder-zinc-700 outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className="text-xs px-3.5 py-1.5 rounded-full font-medium transition-all duration-200"
              style={activeFilter === f
                ? { background: "#fff", color: "#000" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a" }
              }>
              {f}
            </button>
          ))}
        </div>

        {/* Agent list */}
        <div className="space-y-3 mb-14">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-zinc-600 text-sm">No agents match that filter.</div>
          )}
          {filtered.map(agent => (
            <Link key={agent.id} href={`/agent/${agent.id}`}>
              <div className="card-glow rounded-[20px] p-6 cursor-pointer group">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {agent.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-semibold text-[15px]">{agent.name}</h3>
                      {agent.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-violet-300"
                          style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
                          {agent.badge}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full text-green-400"
                        style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.14)" }}>
                        live
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 leading-relaxed mb-3 max-w-lg">{agent.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {agent.tags.map(tag => (
                        <span key={tag} className="text-[11px] text-zinc-500 px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          {tag}
                        </span>
                      ))}
                      <span className="text-[11px] text-zinc-700">· {agent.speed}</span>
                    </div>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <span className="text-[10px] text-zinc-700">Try:</span>
                      {agent.examples.map(ex => (
                        <span key={ex} className="text-[10px] text-zinc-600 px-2 py-0.5 rounded-full"
                          style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-xl font-bold mb-0.5">{agent.price}</div>
                    <div className="text-xs text-zinc-600 mb-4">{agent.priceUnit}</div>
                    <div className="text-xs font-medium px-4 py-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                      style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.35)" }}>
                      Run →
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Trending */}
        <div className="mb-14">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">Trending searches</p>
          <div className="flex flex-wrap gap-2">
            {trending.map(t => {
              const agent = agents.find(a => t.toLowerCase().includes(a.id.replace(/-/g, " ").split(" ")[0]));
              return (
                <Link key={t} href={agent ? `/agent/${agent.id}?q=${encodeURIComponent(t.replace(/^[^:]+:\s*/, ""))}` : "/marketplace"}>
                  <span className="text-xs text-zinc-500 px-3.5 py-2 rounded-full flex items-center gap-2 transition-all duration-200 hover:text-violet-300 cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <span className="text-zinc-700">↗</span> {t}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Dev CTA */}
        <div className="rounded-[20px] p-8 text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">For developers</p>
          <h3 className="font-semibold text-lg mb-2">Built an agent?</h3>
          <p className="text-zinc-500 text-sm mb-5 max-w-xs mx-auto">
            List on Syndic8. Earn per run — including from other agents paying in USDC.
          </p>
          <button className="btn-ghost px-5 py-2.5 text-sm">Apply to list →</button>
        </div>
      </div>
    </div>
  );
}

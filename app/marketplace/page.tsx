import Link from "next/link";
import Logo from "../components/Logo";

const agents = [
  {
    id: "web-research",
    name: "Web Research Agent",
    description: "Give it any question or topic. It searches the web, synthesizes results, and returns a structured report with sources.",
    tags: ["Research", "Summarization"],
    price: "$0.50",
    priceUnit: "per task",
    icon: "🔍",
    speed: "~8s",
    examples: ["AI agent market in 2025", "Latest Anthropic news", "Competitors of Linear.app"],
  },
  {
    id: "due-diligence",
    name: "Due Diligence Agent",
    description: "Input a company name. Get founders, funding history, recent news, competitive landscape, and risk flags — investor-grade.",
    tags: ["Finance", "Company Intel"],
    price: "$2.00",
    priceUnit: "per report",
    icon: "📊",
    speed: "~20s",
    examples: ["Perplexity AI", "Mistral AI", "ElevenLabs"],
  },
  {
    id: "lead-enrichment",
    name: "Lead Enrichment Agent",
    description: "Drop in a name and company. Get their role, background, current focus, and 3 specific non-generic outreach angles.",
    tags: ["Sales", "Lead Gen"],
    price: "$0.25",
    priceUnit: "per lead",
    icon: "🎯",
    speed: "~6s",
    examples: ["Sam Altman, OpenAI", "Garry Tan, YC", "Jensen Huang, NVIDIA"],
  },
];

export default function Marketplace() {
  return (
    <div className="min-h-screen bg-[#060608] text-white overflow-hidden">

      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="blob blob-1" style={{ top: "-200px", left: "15%", opacity: 0.35 }} />
        <div className="blob blob-2" style={{ bottom: "0px", right: "10%", opacity: 0.25 }} />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: "rgba(6,6,8,0.8)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Logo />
        <div className="flex items-center gap-7 text-sm text-zinc-500">
          <span className="text-white text-sm font-medium">Marketplace</span>
          <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="#" className="hover:text-white transition-colors">Docs</Link>
          <button className="btn-ghost px-4 py-1.5 text-sm">List Your Agent</button>
        </div>
      </nav>

      <div className="relative max-w-3xl mx-auto px-6 pt-32 pb-24">

        {/* Header */}
        <div className="mb-14">
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-3">Marketplace</p>
          <h1 className="text-5xl font-bold tracking-[-0.04em] mb-3">Available agents</h1>
          <p className="text-zinc-500 text-[15px]">
            Pick a task. Get results. Pay per run — Stripe or USDC.
          </p>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {["All", "Research", "Finance", "Sales"].map((tag, i) => (
            <button key={tag}
              className="text-xs px-3.5 py-1.5 rounded-full font-medium transition-all duration-200"
              style={i === 0
                ? { background: "#fff", color: "#000" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a" }}>
              {tag}
            </button>
          ))}
        </div>

        {/* Agent cards */}
        <div className="space-y-4">
          {agents.map((agent) => (
            <Link key={agent.id} href={`/agent/${agent.id}`}>
              <div className="card-glow rounded-[20px] p-7 cursor-pointer group">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {agent.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-[15px]">{agent.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full text-green-400"
                        style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}>
                        live
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 leading-relaxed mb-4 max-w-md">{agent.description}</p>

                    {/* Tags */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {agent.tags.map((tag) => (
                        <span key={tag} className="text-[11px] text-zinc-500 px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          {tag}
                        </span>
                      ))}
                      <span className="text-[11px] text-zinc-700">· {agent.speed}</span>
                    </div>

                    {/* Examples */}
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-zinc-700">Try:</span>
                      {agent.examples.map((ex) => (
                        <span key={ex} className="text-[11px] text-zinc-500 px-2.5 py-1 rounded-full cursor-pointer hover:text-violet-400 transition-colors"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-xl font-bold mb-0.5">{agent.price}</div>
                    <div className="text-xs text-zinc-600 mb-4">{agent.priceUnit}</div>
                    <div className="text-xs font-medium px-4 py-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-300"
                      style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.35)" }}>
                      Run →
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Dev CTA */}
        <div className="mt-8 rounded-[20px] p-8 text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-3">For developers</p>
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

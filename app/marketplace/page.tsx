import Link from "next/link";

const agents = [
  {
    id: "web-research",
    name: "Web Research Agent",
    description: "Give it any topic or question. It searches the web and returns a structured, sourced report in seconds.",
    tags: ["Research", "Summarization"],
    price: "$0.50",
    priceUnit: "per task",
    icon: "🔍",
    speed: "~8s",
  },
  {
    id: "due-diligence",
    name: "Due Diligence Agent",
    description: "Input a company name. Get founders, funding history, recent news, competitive landscape, and risk flags.",
    tags: ["Finance", "Company Intel"],
    price: "$2.00",
    priceUnit: "per report",
    icon: "📊",
    speed: "~20s",
  },
  {
    id: "lead-enrichment",
    name: "Lead Enrichment Agent",
    description: "Drop in a name and company. Get role, background, and 3 specific outreach angles.",
    tags: ["Sales", "Lead Gen"],
    price: "$0.25",
    priceUnit: "per lead",
    icon: "🎯",
    speed: "~6s",
  },
];

export default function Marketplace() {
  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-hidden">

      {/* Background grid */}
      <div className="fixed inset-0 bg-grid pointer-events-none" />

      {/* Top glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: "700px",
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
        <div className="flex items-center gap-7 text-sm text-zinc-500">
          <span className="text-white text-sm">Marketplace</span>
          <Link href="#" className="hover:text-white transition-colors">Docs</Link>
          <button
            className="px-4 py-1.5 rounded-full text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            List Your Agent
          </button>
        </div>
      </nav>

      <div className="relative max-w-4xl mx-auto px-6 pt-32 pb-20">

        {/* Header */}
        <div className="mb-12">
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-3">Marketplace</p>
          <h1 className="text-5xl font-bold tracking-[-0.03em] mb-3">Available agents</h1>
          <p className="text-zinc-500 text-[15px]">
            Pay with Stripe or USDC. Results in seconds.
          </p>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {["All", "Research", "Finance", "Sales", "Lead Gen"].map((tag, i) => (
            <button
              key={tag}
              className="text-xs px-3.5 py-1.5 rounded-full font-medium transition-all duration-200"
              style={i === 0
                ? { background: "#ffffff", color: "#000000" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a" }
              }
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Agent list */}
        <div className="space-y-3">
          {agents.map((agent) => (
            <Link key={agent.id} href={`/agent/${agent.id}`}>
              <div
                className="glass rounded-2xl p-6 transition-all duration-300 cursor-pointer group hover:-translate-y-0.5"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-center gap-6">
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    {agent.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[15px] text-white">{agent.name}</h3>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full text-green-400"
                        style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}
                      >
                        live
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 leading-relaxed mb-3 max-w-lg">
                      {agent.description}
                    </p>
                    <div className="flex items-center gap-2">
                      {agent.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] text-zinc-500 px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                        >
                          {tag}
                        </span>
                      ))}
                      <span className="text-[11px] text-zinc-600">· {agent.speed}</span>
                    </div>
                  </div>

                  {/* Price + CTA */}
                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold text-white mb-0.5">{agent.price}</div>
                    <div className="text-xs text-zinc-600 mb-4">{agent.priceUnit}</div>
                    <div
                      className="text-xs font-medium px-4 py-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                      style={{ background: "rgba(124,58,237,0.3)", border: "1px solid rgba(124,58,237,0.4)" }}
                    >
                      Run →
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Dev CTA */}
        <div
          className="mt-8 rounded-2xl p-8 text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-3">For developers</p>
          <h3 className="font-semibold text-lg mb-2">Built an agent?</h3>
          <p className="text-zinc-500 text-sm mb-5 max-w-sm mx-auto">
            List on Syndic8. Earn USDC every time it runs — including from other agents.
          </p>
          <button
            className="text-sm font-medium text-zinc-300 hover:text-white transition-colors px-5 py-2.5 rounded-full"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Apply to list →
          </button>
        </div>
      </div>
    </div>
  );
}

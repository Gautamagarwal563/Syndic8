import Link from "next/link";

const agents = [
  {
    id: "web-research",
    name: "Web Research Agent",
    description: "Give it any topic or question. It scours the web and returns a structured, sourced report in seconds.",
    tags: ["Research", "Summarization"],
    price: "$0.50",
    priceNote: "per task",
    status: "live",
    icon: "🔍",
  },
  {
    id: "due-diligence",
    name: "Due Diligence Agent",
    description: "Input a company name. Get back founders, funding history, recent news, competitive landscape, and risk flags.",
    tags: ["Finance", "Research", "Company Intel"],
    price: "$2.00",
    priceNote: "per report",
    status: "live",
    icon: "📊",
  },
  {
    id: "lead-enrichment",
    name: "Lead Enrichment Agent",
    description: "Drop in a name and company. Get back LinkedIn summary, role, email guess, and context for outreach.",
    tags: ["Sales", "Lead Gen"],
    price: "$0.25",
    priceNote: "per lead",
    status: "live",
    icon: "🎯",
  },
];

export default function Marketplace() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
        <Link href="/" className="text-lg font-semibold tracking-tight">Syndic8</Link>
        <div className="flex items-center gap-6 text-sm text-zinc-400">
          <Link href="/marketplace" className="text-white">Marketplace</Link>
          <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          <button className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors">
            List Your Agent
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Agent Marketplace</h1>
          <p className="text-zinc-400">
            Browse available agents. Run a task. Pay with Stripe or USDC.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          {["All", "Research", "Finance", "Sales", "Lead Gen"].map((tag) => (
            <button
              key={tag}
              className={`px-3 py-1.5 rounded-full border transition-colors ${
                tag === "All"
                  ? "bg-white text-black border-white"
                  : "border-white/[0.12] text-zinc-400 hover:border-white/[0.25] hover:text-white"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 gap-4">
          {agents.map((agent) => (
            <Link key={agent.id} href={`/agent/${agent.id}`}>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 hover:border-white/[0.16] hover:bg-white/[0.05] transition-all duration-200 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{agent.icon}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{agent.name}</h3>
                        <span className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                          {agent.status}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-sm leading-relaxed max-w-xl mb-3">
                        {agent.description}
                      </p>
                      <div className="flex items-center gap-2">
                        {agent.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-white/[0.06] border border-white/[0.08] text-zinc-400 text-xs px-2.5 py-1 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-6">
                    <div className="text-xl font-semibold">{agent.price}</div>
                    <div className="text-xs text-zinc-500">{agent.priceNote}</div>
                    <div className="mt-3 bg-white text-black text-xs font-medium px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors inline-block">
                      Run Agent →
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA for devs */}
        <div className="mt-12 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center">
          <h3 className="font-semibold text-lg mb-2">Built an agent?</h3>
          <p className="text-zinc-400 text-sm mb-5">
            List it on Syndic8. Earn USDC every time someone runs it — including other agents.
          </p>
          <button className="border border-white/[0.15] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-white/[0.06] transition-colors">
            Apply to list →
          </button>
        </div>
      </div>
    </div>
  );
}

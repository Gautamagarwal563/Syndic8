import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sendUSDC, AGENT_WALLETS, ORCHESTRATOR_ADDRESS, BASESCAN_URL } from "../../../lib/blockchain";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AGENT_REGISTRY = {
  "web-research":       { name: "Web Research Agent",       cost: 0.50, icon: "🔍", description: "Search web, return sourced brief" },
  "due-diligence":      { name: "Due Diligence Agent",      cost: 2.00, icon: "📊", description: "Investor-grade company brief" },
  "competitor-analysis":{ name: "Competitor Analysis Agent",cost: 1.50, icon: "⚔️", description: "Competitive breakdown" },
  "investor-research":  { name: "Investor Research Agent",  cost: 1.00, icon: "💼", description: "VC thesis and portfolio" },
  "lead-enrichment":    { name: "Lead Enrichment Agent",    cost: 0.25, icon: "🎯", description: "Person profile and outreach" },
  "startup-validator":  { name: "Startup Validator Agent",  cost: 0.75, icon: "🚀", description: "YC-style idea feedback" },
};

const REAL_PAYMENTS_ENABLED = !!process.env.ORCHESTRATOR_PRIVATE_KEY;

function send(controller: ReadableStreamDefaultController, encoder: TextEncoder, event: object) {
  controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
}

function fakeTxHash(): string {
  return "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export async function POST(req: NextRequest) {
  const { task } = await req.json();
  if (!task?.trim()) {
    return new Response(JSON.stringify({ error: "Task required" }), { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        // Step 1: Plan — which agents to hire
        send(controller, encoder, { type: "thinking", message: "Analyzing task, selecting agents to hire…" });

        const planRes = await anthropic.messages.create({
          model: "claude-opus-4-6",
          max_tokens: 300,
          messages: [{
            role: "user",
            content: `You are an AI orchestrator deciding which specialist agents to hire for a task.

Task: "${task}"

Available agents:
- web-research: general research, news, trends, market info
- due-diligence: deep company analysis, funding, founders, risks
- competitor-analysis: competitive landscape, who wins and why
- investor-research: VC firm thesis, portfolio, what they fund
- lead-enrichment: person background, outreach angles
- startup-validator: startup idea feedback, market, risks

Pick 2-3 agents most relevant to this task. Order matters — foundational research first.
Return ONLY a JSON array. Example: ["web-research", "due-diligence"]`,
          }],
        });

        let agentIds: string[] = [];
        try {
          const text = planRes.content[0].type === "text" ? planRes.content[0].text : "";
          const match = text.match(/\[.*?\]/s);
          if (match) agentIds = JSON.parse(match[0]);
        } catch { agentIds = ["web-research"]; }

        agentIds = agentIds
          .filter(id => id in AGENT_REGISTRY)
          .slice(0, 3);

        if (agentIds.length === 0) agentIds = ["web-research"];

        const totalCost = agentIds.reduce((sum, id) => {
          return sum + (AGENT_REGISTRY[id as keyof typeof AGENT_REGISTRY]?.cost ?? 0);
        }, 0);

        send(controller, encoder, { type: "plan", agents: agentIds, totalCost: totalCost.toFixed(2) });

        // Step 2: Hire and run each agent
        const results: Record<string, string> = {};
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        let walletBalance = 10.00;

        for (const agentId of agentIds) {
          const info = AGENT_REGISTRY[agentId as keyof typeof AGENT_REGISTRY];

          // Attempt real USDC payment on Base Sepolia
          let txHash = fakeTxHash();
          let basescanUrl = `${BASESCAN_URL}/tx/${txHash}`;
          let realPayment = false;
          const agentWallet = AGENT_WALLETS[agentId] ?? "0x0000000000000000000000000000000000000000";

          if (REAL_PAYMENTS_ENABLED) {
            try {
              const payment = await sendUSDC(agentId, info.cost);
              txHash = payment.txHash;
              basescanUrl = payment.basescanUrl;
              realPayment = true;
            } catch (err) {
              console.error("Real payment failed, falling back to simulated:", err);
            }
          }

          send(controller, encoder, {
            type: "hiring",
            agentId,
            agentName: info.name,
            icon: info.icon,
            cost: info.cost.toFixed(2),
            txHash,
            basescanUrl,
            realPayment,
            fromAddress: ORCHESTRATOR_ADDRESS,
            toAddress: agentWallet,
            walletBefore: walletBalance.toFixed(2),
            walletAfter: (walletBalance - info.cost).toFixed(2),
            network: "Base Sepolia",
          });

          walletBalance -= info.cost;

          try {
            const agentRes = await fetch(`${baseUrl}/api/agents/${agentId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ input: task }),
            });

            if (!agentRes.ok) throw new Error("Agent failed");

            const reader = agentRes.body!.getReader();
            const decoder = new TextDecoder();
            let fullText = "";

            send(controller, encoder, { type: "agent_start", agentId, agentName: info.name });

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              fullText += chunk;
              send(controller, encoder, { type: "chunk", agentId, content: chunk });
            }

            results[agentId] = fullText;
            send(controller, encoder, {
              type: "agent_done",
              agentId,
              agentName: info.name,
              cost: info.cost.toFixed(2),
              txHash,
            });

          } catch {
            send(controller, encoder, { type: "agent_error", agentId });
          }
        }

        // Step 3: Synthesize
        send(controller, encoder, { type: "synthesizing", walletBalance: walletBalance.toFixed(2) });

        const context = Object.entries(results)
          .map(([id, text]) => {
            const info = AGENT_REGISTRY[id as keyof typeof AGENT_REGISTRY];
            return `=== ${info?.name ?? id} ===\n${text.slice(0, 1800)}`;
          })
          .join("\n\n");

        const synthStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 700,
          system: `You synthesize reports from multiple AI agents into one sharp executive brief. Prose only. No ## headers. No bullet points. Bold labels like **Executive summary.** to start sections. Add genuine synthesis — don't just repeat what each agent said. Pull the thread that connects all the findings. Max 280 words.`,
          messages: [{
            role: "user",
            content: `Task: ${task}\n\nAgent reports:\n${context}\n\nWrite a synthesized executive brief.`,
          }],
        });

        for await (const chunk of synthStream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            send(controller, encoder, { type: "synthesis_chunk", content: chunk.delta.text });
          }
        }

        send(controller, encoder, {
          type: "complete",
          totalCost: totalCost.toFixed(2),
          agentsHired: agentIds.length,
          walletBalance: walletBalance.toFixed(2),
          txCount: agentIds.length,
        });

      } catch (err) {
        console.error(err);
        send(controller, encoder, { type: "error", message: "Orchestration failed" });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}

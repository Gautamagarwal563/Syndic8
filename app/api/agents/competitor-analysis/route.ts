import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import FirecrawlApp from "@mendable/firecrawl-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) return new Response(JSON.stringify({ error: "Input required" }), { status: 400 });

    const company = input.trim();

    const [companyRes, competitorsRes, marketRes] = await Promise.all([
      firecrawl.search(`${company} product features pricing target market`, { limit: 3 }),
      firecrawl.search(`${company} competitors alternatives vs comparison`, { limit: 4 }),
      firecrawl.search(`${company} market landscape 2024 2025`, { limit: 3 }),
    ]);

    const sources = [
      ...(companyRes.web ?? []),
      ...(competitorsRes.web ?? []),
      ...(marketRes.web ?? []),
    ].map((r: { url: string; title?: string; description?: string }) =>
      `URL: ${r.url}\nTitle: ${r.title || ""}\nSummary: ${r.description || ""}`
    ).join("\n\n---\n\n");

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const messageStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 1800,
          system: `You are a sharp competitive intelligence analyst. Write like a senior strategy consultant at McKinsey — direct, opinionated, specific.

Rules:
- Prose only. No bullet points. No dashes. No ## headers. Never.
- Bold labels like **What they do.** start each section, then prose continues.
- Be specific with names, numbers, and positioning.
- Give a real opinion on who wins and why.
- Max 420 words.`,
          messages: [{
            role: "user",
            content: `Analyze the competitive landscape for: ${company}

Sources:
${sources}

Cover: what ${company} does and who it targets, who the top 3-4 competitors are and how each positions against them, where ${company} has a genuine edge, where competitors are stronger, and which competitor is the real threat. End with a one-sentence strategic verdict.

Prose only. Bold labels per section. No lists or headers.`,
          }],
        });

        for await (const chunk of messageStream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta")
            controller.enqueue(encoder.encode(chunk.delta.text));
        }
        controller.close();
      },
    });

    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Agent failed" }), { status: 500 });
  }
}

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import FirecrawlApp from "@mendable/firecrawl-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) return new Response(JSON.stringify({ error: "Input required" }), { status: 400 });

    const investor = input.trim();

    const [profileRes, portfolioRes, thesisRes] = await Promise.all([
      firecrawl.search(`${investor} investor background thesis focus areas`, { limit: 3 }),
      firecrawl.search(`${investor} portfolio investments funded startups`, { limit: 4 }),
      firecrawl.search(`${investor} recent investments 2024 2025 check size stage`, { limit: 3 }),
    ]);

    const sources = [
      ...(profileRes.web ?? []),
      ...(portfolioRes.web ?? []),
      ...(thesisRes.web ?? []),
    ].map((r: { url: string; title?: string; description?: string }) =>
      `URL: ${r.url}\nTitle: ${r.title || ""}\nSummary: ${r.description || ""}`
    ).join("\n\n---\n\n");

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const messageStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 1400,
          system: `You are a senior VC analyst writing a pre-pitch brief. Write like a founder who's done deep research — sharp, specific, useful for walking into a meeting.

Rules:
- Prose only. No bullet points. No dashes. No ## headers.
- Bold labels like **Their thesis.** start each section.
- Include real portfolio companies, check sizes, and stage preferences where available.
- End with 2 specific reasons why this investor might say yes, and 1 reason they might pass.
- Max 380 words.`,
          messages: [{
            role: "user",
            content: `Research this investor or VC firm for a founder preparing to pitch: ${investor}

Sources:
${sources}

Cover: who they are and their background, their investment thesis and focus areas, notable portfolio companies, typical check size and stage, what they consistently look for in founders, and your honest assessment of fit.

Prose only. Bold labels. No lists.`,
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

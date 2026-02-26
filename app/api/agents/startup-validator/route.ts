import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import FirecrawlApp from "@mendable/firecrawl-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) return new Response(JSON.stringify({ error: "Input required" }), { status: 400 });

    const idea = input.trim();

    const [marketRes, competitorRes, trendsRes] = await Promise.all([
      firecrawl.search(`${idea} market size opportunity TAM 2024 2025`, { limit: 3 }),
      firecrawl.search(`${idea} existing companies startups competitors`, { limit: 4 }),
      firecrawl.search(`${idea} trends growth demand problems pain points`, { limit: 3 }),
    ]);

    const sources = [
      ...(marketRes.web ?? []),
      ...(competitorRes.web ?? []),
      ...(trendsRes.web ?? []),
    ].map((r: { url: string; title?: string; description?: string }) =>
      `URL: ${r.url}\nTitle: ${r.title || ""}\nSummary: ${r.description || ""}`
    ).join("\n\n---\n\n");

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const messageStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 1600,
          system: `You are a YC partner giving brutally honest feedback on a startup idea. Write like Paul Graham — direct, no fluff, no encouragement that isn't earned.

Rules:
- Prose only. No bullet points. No dashes. No ## headers.
- Bold labels like **The market.** start each section.
- Be honest. If the idea is crowded, say so. If the timing is wrong, say so.
- Use real market data and competitor names where available.
- End with a clear verdict: pursue, pivot, or pass — with one sentence of reasoning.
- Max 400 words.`,
          messages: [{
            role: "user",
            content: `Validate this startup idea: ${idea}

Sources:
${sources}

Cover: what the real market opportunity looks like (with size if available), who's already doing this and how funded they are, what the genuine pain point is and whether it's acute enough, the biggest risk to this idea, and whether there's a defensible angle. End with your verdict.

Prose only. Bold labels. No lists or headers.`,
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

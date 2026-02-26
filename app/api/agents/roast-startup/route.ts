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

    const [existingRes, fundingRes] = await Promise.all([
      firecrawl.search(`${idea} startup company existing competitors`, { limit: 4 }),
      firecrawl.search(`${idea} VC funding raised Series`, { limit: 3 }),
    ]);

    const sources = [
      ...(existingRes.web ?? []),
      ...(fundingRes.web ?? []),
    ].map((r: { url: string; title?: string; description?: string }) =>
      `URL: ${r.url}\nTitle: ${r.title || ""}\nSummary: ${r.description || ""}`
    ).join("\n\n---\n\n");

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const messageStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 1200,
          system: `You are a brutally funny, sharp startup critic — part YC partner, part comedian. You roast startup ideas like a seasoned investor who has seen it all. Be specific, be funny, be honest. Don't be mean for its own sake — the roast should be so accurate it stings.

Rules:
- Prose only. No bullet points. No dashes. No ## headers.
- Bold labels like **The crowded reality.** start each section.
- Be specific — name real competitors, real funded companies, real reasons why this is hard.
- Use dry wit. One well-placed joke lands better than ten punchlines.
- End with a "Verdict" — one sentence on whether this is doomed, a pivot away from something good, or actually interesting despite the roast.
- Max 350 words.`,
          messages: [{
            role: "user",
            content: `Roast this startup idea: ${idea}

Research context:
${sources}

Cover: who's already doing this (and how funded they are), what the fatal flaw is, what the founder is probably getting wrong, and whether there's anything salvageable. End with a one-sentence verdict.

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

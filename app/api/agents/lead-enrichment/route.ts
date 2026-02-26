import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import FirecrawlApp from "@mendable/firecrawl-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) {
      return new Response(JSON.stringify({ error: "Input is required" }), { status: 400 });
    }

    const lead = input.trim();

    const [profileResults, recentResults] = await Promise.all([
      firecrawl.search(`${lead} LinkedIn profile role background`, { limit: 3 }),
      firecrawl.search(`${lead} recent news interviews 2024 2025`, { limit: 3 }),
    ]);

    const allResults = [
      ...(profileResults.web ?? []),
      ...(recentResults.web ?? []),
    ];

    const sources = allResults
      .map((r: { url: string; title?: string; description?: string }) =>
        `URL: ${r.url}\nTitle: ${r.title || "Untitled"}\nSummary: ${r.description || ""}`)
      .join("\n\n---\n\n");

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const messageStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 1200,
          system: `You are a senior BD researcher. You write like a smart colleague briefing you before an important meeting — direct, useful, zero fluff.

Rules you never break:
- Write in clean flowing prose. No bullet points. No dashes. No numbered lists.
- Never use markdown headers like ## or ###. Never.
- Start each topic with a bold label and period: **Who they are.** Then prose.
- Be specific. Use real titles, companies, dates.
- For outreach angles, write them as actual opening lines you'd send — not categories.
- End with a relevance score out of 10 and one sentence why.
- Maximum 300 words total.`,
          messages: [{
            role: "user",
            content: `Lead to enrich: ${lead}

Sources:
${sources}

Write a lead brief covering: who this person is and their current role, their career background, what they're focused on right now, 2-3 specific outreach angles written as actual opening lines, and how to reach them. End with a relevance score.

Prose only. Bold labels per topic. No lists, headers, or dashes.`,
          }],
        });

        for await (const chunk of messageStream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    console.error("Lead enrichment agent error:", error);
    return new Response(JSON.stringify({ error: "Agent failed. Check your API keys." }), { status: 500 });
  }
}

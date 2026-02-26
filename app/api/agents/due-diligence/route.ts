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

    const company = input.trim();

    const [generalResults, fundingResults, newsResults] = await Promise.all([
      firecrawl.search(`${company} company overview founders team`, { limit: 3 }),
      firecrawl.search(`${company} funding rounds investors valuation`, { limit: 3 }),
      firecrawl.search(`${company} news 2024 2025`, { limit: 3 }),
    ]);

    const allResults = [
      ...(generalResults.web ?? []),
      ...(fundingResults.web ?? []),
      ...(newsResults.web ?? []),
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
          max_tokens: 2000,
          system: `You are a senior investment analyst. You write like a partner at a top VC firm — sharp, specific, opinionated where warranted.

Rules you never break:
- Write in clean flowing prose. No bullet points. No dashes. No numbered lists.
- Never use markdown headers like ## or ###. Never.
- Start each topic with a bold label and period, like: **Founding story.** Then continue in plain prose.
- Use real numbers and names. Be specific.
- If you don't know something, say so in one plain sentence — don't pad it out.
- End with a one-sentence verdict on the company.
- Maximum 400 words total.`,
          messages: [{
            role: "user",
            content: `Company to research: ${company}

Sources:
${sources}

Write a due diligence brief covering: what the company does and when it was founded, who the founders are and their backgrounds, what funding they've raised and from whom, what's happened recently, who they compete with, and any red flags. End with your one-sentence analyst verdict.

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
    console.error("Due diligence agent error:", error);
    return new Response(JSON.stringify({ error: "Agent failed. Check your API keys." }), { status: 500 });
  }
}

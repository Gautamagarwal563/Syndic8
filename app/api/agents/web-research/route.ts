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

    const searchResults = await firecrawl.search(input, { limit: 6 });
    const webResults = searchResults.web ?? [];
    const sources = webResults
      .map((r: { url: string; title?: string; description?: string }) =>
        `URL: ${r.url}\nTitle: ${r.title || "Untitled"}\nSummary: ${r.description || ""}`)
      .join("\n\n---\n\n");

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const messageStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 1500,
          system: `You are a sharp research analyst. You write like a senior journalist at The Economist — clear, direct, no filler, no jargon.

Rules you never break:
- Write in clean flowing prose. No bullet points. No dashes. No numbered lists.
- Never use markdown headers like ## or ###. Never.
- Start each new topic with a bold label followed by a period, like: **What it is.** Then continue in plain prose on the same line.
- Keep sentences short and specific. Cut every word that doesn't earn its place.
- Sound like a human expert, not a template.
- Maximum 350 words total.`,
          messages: [{
            role: "user",
            content: `Research query: ${input}

Sources found:
${sources}

Write a research brief. Cover: what the answer is, the key facts and context, any tensions or nuances worth knowing, and 2-3 source URLs at the end labeled "Sources:" on a new line.

Remember: prose only, bold labels for each topic, no lists, no headers, no dashes.`,
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
    console.error("Web research agent error:", error);
    return new Response(JSON.stringify({ error: "Agent failed. Check your API keys." }), { status: 500 });
  }
}

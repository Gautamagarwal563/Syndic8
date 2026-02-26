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
          messages: [{
            role: "user",
            content: `You are a research agent. Based on the web search results below, write a structured research report.

Query: ${input}

Search Results:
${sources}

Write a clear structured report with these sections:
## Key Findings
3-5 bullet points of the most important findings.

## Summary
2-3 paragraphs synthesizing everything.

## Sources
List the URLs referenced.

Be factual. Cite specifics from the sources. Keep it tight.`,
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

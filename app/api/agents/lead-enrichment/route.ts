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
          messages: [{
            role: "user",
            content: `You are a lead enrichment agent for sales and BD teams. Enrich this lead.

Lead: ${lead}

Search Results:
${sources}

Use exactly these sections:

## Identity
Full name, current title, current company.

## Background
Career history in 2-3 sentences.

## Current Focus
What they're working on based on recent signals.

## Conversation Starters
3 specific, non-generic outreach angles tied to their actual work.

## Contact Signals
Public email patterns, social handles, or preferred channels.

## Relevance Score
Rate 1-10 with one sentence of reasoning.

Only use facts from the sources. Flag gaps.`,
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

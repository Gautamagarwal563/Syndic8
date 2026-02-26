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
          messages: [{
            role: "user",
            content: `You are a due diligence agent used by investors. Produce a structured report on this company.

Company: ${company}

Search Results:
${sources}

Use exactly these sections:

## Overview
What the company does, when founded, HQ location.

## Founders & Team
Key people, backgrounds, notable hires.

## Funding & Financials
All known rounds, investors, valuation. Note if public.

## Recent News
3-5 most notable recent developments.

## Competitive Landscape
Main competitors and how this company differentiates.

## Risk Flags
Regulatory, financial, reputational, or strategic concerns.

## Verdict
2-sentence analyst summary.

Only include facts you can support from the sources. Flag gaps explicitly.`,
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

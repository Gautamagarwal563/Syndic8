import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import FirecrawlApp from "@mendable/firecrawl-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    const company = input.trim();

    // Step 1: Search multiple angles on the company
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
      .map((r: { url: string; title?: string; description?: string }) => `URL: ${r.url}\nTitle: ${r.title || "Untitled"}\nSummary: ${r.description || ""}`)
      .join("\n\n---\n\n");

    // Step 2: Claude produces a due diligence report
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are a due diligence agent used by investors and analysts. Based on the search results below, produce a structured due diligence report on the company.

Company: ${company}

Search Results:
${sources}

Produce a report with these exact sections:

## Overview
Brief description of what the company does, when founded, HQ.

## Founders & Team
Key people, their backgrounds, notable hires.

## Funding & Financials
Known funding rounds, investors, valuation estimates. Note if public.

## Recent News
3-5 most notable recent developments.

## Competitive Landscape
Main competitors and how this company differentiates.

## Risk Flags
Any concerns: regulatory, financial, reputational, or strategic.

## Verdict
2-sentence analyst summary.

Only include what you can support from the sources. Note gaps explicitly.`,
        },
      ],
    });

    const result = message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Due diligence agent error:", error);
    return NextResponse.json({ error: "Agent failed. Check your API keys." }, { status: 500 });
  }
}

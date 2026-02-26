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

    const lead = input.trim();

    // Step 1: Search for the person
    const [profileResults, recentResults] = await Promise.all([
      firecrawl.search(`${lead} LinkedIn profile role background`, { limit: 3 }),
      firecrawl.search(`${lead} recent news interviews talks 2024 2025`, { limit: 3 }),
    ]);

    const allResults = [...profileResults.data, ...recentResults.data];

    const sources = allResults
      .map((r: { url: string; title?: string; markdown?: string }) => `URL: ${r.url}\nTitle: ${r.title || "Untitled"}\nContent: ${r.markdown?.slice(0, 600) || ""}`)
      .join("\n\n---\n\n");

    // Step 2: Claude enriches the lead
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `You are a lead enrichment agent used by sales and BD teams. Based on the search results, enrich the following lead.

Lead: ${lead}

Search Results:
${sources}

Produce a structured lead profile:

## Identity
Full name, current title, current company.

## Background
Career history summary in 2-3 sentences.

## Current Focus
What they're working on right now based on recent activity.

## Conversation Starters
3 specific, non-generic angles for outreach based on their actual work and interests.

## Contact Signals
Any public email patterns, social handles, or preferred contact methods found.

## Relevance Score
Rate 1-10 how reachable/warm this lead seems based on available signals, with one sentence of reasoning.

Only include what's supported by the sources. Flag gaps.`,
        },
      ],
    });

    const result = message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Lead enrichment agent error:", error);
    return NextResponse.json({ error: "Agent failed. Check your API keys." }, { status: 500 });
  }
}

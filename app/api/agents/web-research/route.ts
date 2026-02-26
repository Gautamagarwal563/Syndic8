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

    // Step 1: Search the web with Firecrawl
    const searchResults = await firecrawl.search(input, { limit: 5 });

    const webResults = searchResults.web ?? [];
    const sources = webResults
      .map((r: { url: string; title?: string; description?: string }) => `URL: ${r.url}\nTitle: ${r.title || "Untitled"}\nSummary: ${r.description || ""}`)
      .join("\n\n---\n\n");

    // Step 2: Claude synthesizes the results
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `You are a research agent. Based on the web search results below, write a structured research report answering the query.

Query: ${input}

Search Results:
${sources}

Write a clear, structured report with:
1. Key Findings (3-5 bullet points)
2. Detailed Summary (2-3 paragraphs)
3. Sources (list the URLs used)

Be factual, cite specific details from the sources, and keep it concise.`,
        },
      ],
    });

    const result = message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Web research agent error:", error);
    return NextResponse.json({ error: "Agent failed. Check your API keys." }, { status: 500 });
  }
}

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import FirecrawlApp from "@mendable/firecrawl-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) return new Response(JSON.stringify({ error: "Input required" }), { status: 400 });

    const company = input.trim();

    const [jobsRes, careersRes, linkedinRes] = await Promise.all([
      firecrawl.search(`${company} jobs hiring 2025 site:greenhouse.io OR site:lever.co OR site:ashbyhq.com`, { limit: 5 }),
      firecrawl.search(`${company} careers open roles engineering product 2025`, { limit: 4 }),
      firecrawl.search(`${company} hiring LinkedIn jobs engineering design`, { limit: 3 }),
    ]);

    const sources = [
      ...(jobsRes.web ?? []),
      ...(careersRes.web ?? []),
      ...(linkedinRes.web ?? []),
    ].map((r) => {
      const item = r as { url?: string; title?: string; description?: string };
      return `LISTING: ${item.title || ""}\n${item.description || ""}\nURL: ${item.url || ""}`;
    }).join("\n\n---\n\n");

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const messageStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 1600,
          system: `You are a competitive intelligence analyst who reads job postings like a seasoned investor reads financial statements. Every job listing is a signal — what a company is building, where they're struggling, what they're betting on.

Rules:
- Prose only. No bullet points. No ## headers.
- Bold labels like **What they're building.** or **Where they're hurting.** start each section.
- Be specific — name actual roles, infer from job titles what product decisions they've made.
- Multiple ML engineer postings = they're scaling AI. Multiple SRE postings = reliability problems.
- Absence is also a signal: not hiring sales = product-led, not hiring designers = technical-first.
- Salary ranges (if visible) reveal their budget and seniority bar.
- End with a "Strategic read" — one sentence on what this hiring pattern reveals about where this company is heading in the next 12 months.
- Max 420 words.`,
          messages: [{
            role: "user",
            content: `Analyze the job postings and hiring activity for: ${company}

Job listings found:
${sources || "No direct job listings found — infer from any available signals."}

Write a Job Board Intelligence report. What are they hiring most heavily? What does the role mix say about their product roadmap? What problems are they trying to solve? What does this hiring pattern reveal about their next 12 months? End with your strategic read.`,
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

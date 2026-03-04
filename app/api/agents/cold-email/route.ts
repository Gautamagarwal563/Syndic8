import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import FirecrawlApp from "@mendable/firecrawl-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) return new Response(JSON.stringify({ error: "Input required" }), { status: 400 });

    const [profileRes, companyRes, recentRes] = await Promise.all([
      firecrawl.search(`${input} LinkedIn background career`, { limit: 3 }),
      firecrawl.search(`${input} company product news 2025`, { limit: 3 }),
      firecrawl.search(`${input} recent interview blog post 2024 2025`, { limit: 2 }),
    ]);

    const sources = [
      ...(profileRes.web ?? []),
      ...(companyRes.web ?? []),
      ...(recentRes.web ?? []),
    ].map((r) => {
      const item = r as { url?: string; title?: string; description?: string };
      return `${item.title || ""}: ${item.description || ""}`;
    }).join("\n\n");

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const messageStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 1200,
          system: `You are a world-class cold email writer. You write emails that get replies — specific, human, no fluff. You've studied the best cold emails ever written and know exactly what makes someone respond.

Rules:
- Output the email exactly as it should be sent — Subject line first, then body
- No preamble, no "here's the email", just the email itself
- Subject line: under 8 words, curiosity-driven, no clickbait
- Opening: reference something specific and real about them (not generic)
- Body: 3-4 sentences max. One clear value prop. One specific ask.
- CTA: one question or one specific action, never two
- PS line: optional, but if used, make it land
- No em dashes. No corporate speak. Sound like a smart human.
- Format: Subject: [line]\n\n[body]`,
          messages: [{
            role: "user",
            content: `Write a cold email to: ${input}

Research context:
${sources}

Write a cold email that will get a reply. Be specific to this person — use something real from their background or company. Make it feel like you actually know them.`,
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

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import FirecrawlApp from "@mendable/firecrawl-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) return new Response(JSON.stringify({ error: "Input required" }), { status: 400 });

    const target = input.trim();

    // If it looks like a URL, scrape it directly. Otherwise search for it.
    let tosContent = "";
    const isUrl = target.startsWith("http://") || target.startsWith("https://");

    if (isUrl) {
      try {
        const scraped = await (firecrawl as unknown as {
          scrapeUrl: (url: string, opts: object) => Promise<{ markdown?: string }>
        }).scrapeUrl(target, { formats: ["markdown"] });
        tosContent = scraped.markdown?.slice(0, 8000) || "";
      } catch {
        // fallback to search
      }
    }

    if (!tosContent) {
      const searchQuery = isUrl ? `${target} terms of service privacy policy` : `${target} terms of service site:${target.replace(/https?:\/\//, "").split("/")[0]}`;
      const [tosRes, privacyRes] = await Promise.all([
        firecrawl.search(`${target} terms of service user agreement`, { limit: 3 }),
        firecrawl.search(`${target} privacy policy data collection`, { limit: 3 }),
      ]);
      tosContent = [
        ...(tosRes.web ?? []),
        ...(privacyRes.web ?? []),
      ].map((r) => {
        const item = r as { title?: string; description?: string };
        return `${item.title || ""}: ${item.description || ""}`;
      }).join("\n\n");
    }

    if (!tosContent.trim()) {
      return new Response(JSON.stringify({ error: "Could not retrieve Terms of Service for this URL." }), { status: 422 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const messageStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 1600,
          system: `You are a plain-English legal analyst. You read Terms of Service and Privacy Policies and tell people exactly what they agreed to — in language a 10-year-old could understand. You're not a lawyer, but you're sharper than most.

Rules:
- Prose only. No bullet points. No ## headers.
- Bold labels like **What they collect.** or **The scary part.** start each section.
- Be direct and specific. Quote the actual clause when it's important.
- Don't sugarcoat red flags — if something is bad, say it's bad.
- Cover: data collection, what they can do with your data, account termination, arbitration clauses, auto-renewal, and liability limits.
- Rate each area: 🟢 fair / 🟡 watch out / 🔴 red flag
- End with an "Overall verdict" — one sentence on whether this TOS is normal, unusually aggressive, or genuinely problematic.
- Max 420 words.`,
          messages: [{
            role: "user",
            content: `Analyze the Terms of Service for: ${target}

TOS/Privacy content:
${tosContent}

Write a plain-English TOS analysis. Cover what they collect, what they can do with your data, what happens if they delete your account, any arbitration or class action waiver, auto-renewal terms, and the biggest red flags. Use the emoji ratings. End with your verdict.`,
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

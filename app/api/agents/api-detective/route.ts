import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import FirecrawlApp from "@mendable/firecrawl-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { input, imageData, mimeType } = await req.json();

    if (!imageData) {
      return new Response(JSON.stringify({ error: "Image required" }), { status: 400 });
    }

    const validMime = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType)
      ? mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp"
      : "image/png";

    // Step 1: Claude Vision identifies APIs from the screenshot
    const visionRes = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: validMime, data: imageData },
          },
          {
            type: "text",
            text: `You are an expert at reverse-engineering apps from screenshots.

Analyze this screenshot carefully. Identify every API, SDK, third-party service, and infrastructure tool this app is likely using, based on:
- UI components and design patterns (Stripe payment UI, Google Maps, Mapbox, etc.)
- Logos, "powered by" badges, or brand indicators visible
- Loading states, skeleton screens, data structures
- Error messages or dev artifacts visible
- Typography suggesting font APIs (Google Fonts, etc.)
- Authentication UI (Auth0, Clerk, Firebase, etc.)
- Analytics patterns, chat widgets, support tools

Return ONLY valid JSON in this exact structure:
{
  "appName": "name if visible, else null",
  "apis": [
    {
      "name": "Service/API name",
      "category": "payments|auth|analytics|maps|infra|ai|comms|data|storage|other",
      "confidence": "high|medium|low",
      "evidence": "brief reason why"
    }
  ]
}`,
          },
        ],
      }],
    });

    let detected: {
      appName?: string;
      apis?: Array<{ name: string; category: string; confidence: string; evidence: string }>;
    } = { apis: [] };

    try {
      const text = visionRes.content[0].type === "text" ? visionRes.content[0].text : "{}";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) detected = JSON.parse(match[0]);
    } catch { detected = { apis: [] }; }

    // Step 2: Research the top detected APIs
    const topApis = (detected.apis ?? []).slice(0, 6).map(a => a.name).join(", ");
    let researchContext = "";

    if (topApis) {
      try {
        const searchRes = await firecrawl.search(
          `${topApis} API pricing documentation technical stack`,
          { limit: 5 }
        );
        researchContext = (searchRes.web ?? []).map((r) => {
          const item = r as { url?: string; title?: string; description?: string };
          return `${item.title || ""}: ${item.description || ""}`;
        }).join("\n");
      } catch { /* research is supplemental */ }
    }

    // Step 3: Stream the detective report
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const messageStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 1500,
          system: `You are the world's best API detective — a senior engineer who can reverse-engineer any app's tech stack from a screenshot. You write sharp, specific intelligence reports.

Rules:
- Prose only. No bullet points. No ## headers.
- Bold labels like **Payment stack.** or **Auth layer.** start each section. Then prose.
- Group APIs by category. Be specific about what each choice reveals.
- Mention pricing, scale implications, and what the choice signals about the company.
- Call out interesting or surprising choices.
- End with a "Tech stack verdict" — one sentence on what this tells you about the company's engineering maturity, scale, and priorities.
- Max 420 words.`,
          messages: [{
            role: "user",
            content: `App: ${detected.appName || (input ? `"${input}"` : "Unknown")}

APIs detected by visual analysis:
${JSON.stringify(detected.apis ?? [], null, 2)}

Additional context from research:
${researchContext || "No additional context found."}

Write a full API Detective report. Group by category, explain what each choice reveals, and end with your tech stack verdict.`,
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

    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (err) {
    console.error("API Detective error:", err);
    return new Response(JSON.stringify({ error: "Agent failed. Check your API keys." }), { status: 500 });
  }
}

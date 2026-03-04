import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface HNHit {
  objectID: string;
  title?: string;
  story_text?: string;
  comment_text?: string;
  url?: string;
  points?: number;
  num_comments?: number;
  author?: string;
  created_at?: string;
  _tags?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) return new Response(JSON.stringify({ error: "Input required" }), { status: 400 });

    const query = encodeURIComponent(input.trim());

    // Fetch stories + comments from HN Algolia API (free, no auth)
    const [storiesRes, commentsRes] = await Promise.all([
      fetch(`https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=10`),
      fetch(`https://hn.algolia.com/api/v1/search?query=${query}&tags=comment&hitsPerPage=15`),
    ]);

    const [storiesData, commentsData] = await Promise.all([
      storiesRes.json(),
      commentsRes.json(),
    ]);

    const stories: HNHit[] = storiesData.hits ?? [];
    const comments: HNHit[] = commentsData.hits ?? [];

    const storyContext = stories.slice(0, 8).map(s =>
      `STORY [${s.points ?? 0} pts, ${s.num_comments ?? 0} comments]: "${s.title || ""}"\n${s.story_text ? s.story_text.slice(0, 200) : ""}\nURL: ${s.url || `https://news.ycombinator.com/item?id=${s.objectID}`}`
    ).join("\n\n---\n\n");

    const commentContext = comments.slice(0, 10).map(c =>
      `COMMENT by ${c.author || "anon"}: "${(c.comment_text || "").replace(/<[^>]*>/g, "").slice(0, 300)}"`
    ).join("\n\n");

    const totalStories = storiesData.nbHits ?? 0;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const messageStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 1400,
          system: `You are a Hacker News analyst. You read the technical community's pulse with precision — you know when HN loves something, when they're skeptical, and when they're ignoring it entirely.

Rules:
- Prose only. No bullet points. No ## headers.
- Bold labels like **What HN thinks.** start each section.
- Be specific — quote actual comments, cite real thread titles, mention point counts.
- Separate signal from noise: HN has opinions on everything, but not all opinions matter equally.
- End with a "Community verdict" — one sentence on where this topic stands with the technical community.
- Max 380 words.`,
          messages: [{
            role: "user",
            content: `Analyze Hacker News sentiment and discussion for: "${input.trim()}"

Total HN stories found: ${totalStories}

Top stories:
${storyContext || "No major stories found."}

Sample community comments:
${commentContext || "No significant comment threads found."}

Write a HN Pulse report. Cover what the community is saying, the overall sentiment, the most interesting threads, what technical people specifically praise or criticize, and what the level of discussion activity signals about community interest.`,
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

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseRepo(input: string): { owner: string; repo: string } | null {
  const cleaned = input.trim().replace(/\/$/, "");
  // Handle full URL: https://github.com/owner/repo
  const urlMatch = cleaned.match(/github\.com\/([^/]+)\/([^/\s]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  // Handle owner/repo format
  const shortMatch = cleaned.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
  return null;
}

async function ghFetch(url: string) {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) return new Response(JSON.stringify({ error: "Input required" }), { status: 400 });

    const parsed = parseRepo(input);
    if (!parsed) return new Response(JSON.stringify({ error: "Invalid GitHub URL or owner/repo format" }), { status: 400 });

    const { owner, repo } = parsed;
    const base = `https://api.github.com/repos/${owner}/${repo}`;

    const [repoData, contributors, languages, commits, releases] = await Promise.all([
      ghFetch(base),
      ghFetch(`${base}/contributors?per_page=10`),
      ghFetch(`${base}/languages`),
      ghFetch(`${base}/commits?per_page=15`),
      ghFetch(`${base}/releases?per_page=5`),
    ]);

    if (!repoData) {
      return new Response(JSON.stringify({ error: "Repository not found or is private" }), { status: 404 });
    }

    const languageList = languages ? Object.entries(languages as Record<string, number>)
      .sort(([, a], [, b]) => b - a)
      .map(([lang, bytes]) => `${lang} (${bytes.toLocaleString()} bytes)`)
      .join(", ") : "Unknown";

    const topContributors = (contributors as Array<{ login: string; contributions: number }> | null)?.slice(0, 5)
      .map(c => `@${c.login} (${c.contributions} commits)`)
      .join(", ") || "No contributor data";

    const recentCommits = (commits as Array<{ commit: { message: string; author: { date: string } }; author?: { login: string } }> | null)
      ?.slice(0, 8)
      .map(c => `- ${c.commit.message.split("\n")[0].slice(0, 80)} (${c.commit.author?.date?.slice(0, 10) || "unknown"})`)
      .join("\n") || "No recent commits";

    const latestRelease = (releases as Array<{ tag_name: string; published_at: string; name: string }> | null)?.[0];
    const releaseInfo = latestRelease
      ? `Latest: ${latestRelease.tag_name} — ${latestRelease.name} (${latestRelease.published_at?.slice(0, 10)})`
      : "No releases";

    const busFactor = (contributors as Array<{ contributions: number }> | null)?.length ?? 0;
    const topContribPct = busFactor > 0
      ? Math.round(((contributors as Array<{ contributions: number }>)[0]?.contributions / repoData.size) * 100)
      : 0;

    const context = `
Repository: ${owner}/${repo}
Description: ${repoData.description || "None"}
Stars: ${repoData.stargazers_count?.toLocaleString()} | Forks: ${repoData.forks_count?.toLocaleString()} | Watchers: ${repoData.subscribers_count?.toLocaleString()}
Open Issues: ${repoData.open_issues_count?.toLocaleString()}
Primary Language: ${repoData.language || "Unknown"}
All Languages: ${languageList}
Created: ${repoData.created_at?.slice(0, 10)} | Last Push: ${repoData.pushed_at?.slice(0, 10)}
License: ${repoData.license?.name || "None"}
Topics: ${repoData.topics?.join(", ") || "None"}
Archived: ${repoData.archived ? "YES" : "No"}
Fork: ${repoData.fork ? "YES (forked from another repo)" : "No"}
Contributors shown: ${busFactor}
Top contributors: ${topContributors}
Releases: ${releaseInfo}
Recent commits:
${recentCommits}
    `.trim();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const messageStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 1600,
          system: `You are a senior engineering analyst who can read a GitHub repository's health, activity, and trajectory like a doctor reading a patient chart. You write sharp, specific intelligence reports for CTOs, investors, and engineering leaders.

Rules:
- Prose only. No bullet points. No ## headers.
- Bold labels like **Project health.** start each section.
- Be specific with numbers — stars, commit velocity, contributor count.
- Assess bus factor honestly: is this a one-person project or a real team?
- Read commit messages to infer what they're actually working on.
- Language choices reveal engineering culture — comment on it.
- End with a "Repo verdict" — one sentence on the project's momentum and health.
- Max 420 words.`,
          messages: [{
            role: "user",
            content: `Analyze this GitHub repository: ${owner}/${repo}

${context}

Write a GitHub Intelligence report. Cover: what this project actually does and who maintains it, the health and momentum (stars growth, commit frequency, contributor diversity), bus factor risk, what the recent commits reveal about current priorities, and the tech stack choices. End with your repo verdict.`,
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

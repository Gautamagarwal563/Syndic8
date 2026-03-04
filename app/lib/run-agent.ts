import Anthropic from "@anthropic-ai/sdk";
import FirecrawlApp from "@mendable/firecrawl-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

function mapSources(results: unknown[]): string {
  return results
    .map((r) => {
      const item = r as { url?: string; title?: string; description?: string };
      return `URL: ${item.url || ""}\nTitle: ${item.title || ""}\nSummary: ${item.description || ""}`;
    })
    .join("\n\n---\n\n");
}

async function streamClaude(
  system: string,
  userContent: string,
  maxTokens: number,
  onChunk: (text: string) => void
): Promise<string> {
  const messageStream = anthropic.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userContent }],
  });
  let fullText = "";
  for await (const chunk of messageStream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      fullText += chunk.delta.text;
      onChunk(chunk.delta.text);
    }
  }
  return fullText;
}

export async function runAgent(
  agentId: string,
  input: string,
  onChunk: (chunk: string) => void = () => {}
): Promise<string> {
  const t = input.trim();

  switch (agentId) {
    case "web-research": {
      const res = await firecrawl.search(t, { limit: 6 });
      const sources = mapSources(res.web ?? []);
      return streamClaude(
        `You are a sharp research analyst. Write like a senior journalist at The Economist — clear, direct, no filler, no jargon.\n\nRules you never break:\n- Write in clean flowing prose. No bullet points. No dashes. No numbered lists.\n- Never use markdown headers like ## or ###. Never.\n- Start each new topic with a bold label followed by a period, like: **What it is.** Then continue in plain prose on the same line.\n- Keep sentences short and specific. Cut every word that doesn't earn its place.\n- Sound like a human expert, not a template.\n- Maximum 350 words total.`,
        `Research query: ${t}\n\nSources found:\n${sources}\n\nWrite a research brief. Cover: what the answer is, the key facts and context, any tensions or nuances worth knowing, and 2-3 source URLs at the end labeled "Sources:" on a new line.\n\nRemember: prose only, bold labels for each topic, no lists, no headers, no dashes.`,
        1500,
        onChunk
      );
    }

    case "due-diligence": {
      const [generalRes, fundingRes, newsRes] = await Promise.all([
        firecrawl.search(`${t} company overview founders team`, { limit: 3 }),
        firecrawl.search(`${t} funding rounds investors valuation`, { limit: 3 }),
        firecrawl.search(`${t} news 2024 2025`, { limit: 3 }),
      ]);
      const sources = mapSources([...(generalRes.web ?? []), ...(fundingRes.web ?? []), ...(newsRes.web ?? [])]);
      return streamClaude(
        `You are a senior investment analyst. You write like a partner at a top VC firm — sharp, specific, opinionated where warranted.\n\nRules you never break:\n- Write in clean flowing prose. No bullet points. No dashes. No numbered lists.\n- Never use markdown headers like ## or ###. Never.\n- Start each topic with a bold label and period, like: **Founding story.** Then continue in plain prose.\n- Use real numbers and names. Be specific.\n- If you don't know something, say so in one plain sentence — don't pad it out.\n- End with a one-sentence verdict on the company.\n- Maximum 400 words total.`,
        `Company to research: ${t}\n\nSources:\n${sources}\n\nWrite a due diligence brief covering: what the company does and when it was founded, who the founders are and their backgrounds, what funding they've raised and from whom, what's happened recently, who they compete with, and any red flags. End with your one-sentence analyst verdict.\n\nProse only. Bold labels per topic. No lists, headers, or dashes.`,
        2000,
        onChunk
      );
    }

    case "competitor-analysis": {
      const [companyRes, competitorsRes, marketRes] = await Promise.all([
        firecrawl.search(`${t} product features pricing target market`, { limit: 3 }),
        firecrawl.search(`${t} competitors alternatives vs comparison`, { limit: 4 }),
        firecrawl.search(`${t} market landscape 2024 2025`, { limit: 3 }),
      ]);
      const sources = mapSources([...(companyRes.web ?? []), ...(competitorsRes.web ?? []), ...(marketRes.web ?? [])]);
      return streamClaude(
        `You are a sharp competitive intelligence analyst. Write like a senior strategy consultant at McKinsey — direct, opinionated, specific.\n\nRules:\n- Prose only. No bullet points. No dashes. No ## headers. Never.\n- Bold labels like **What they do.** start each section, then prose continues.\n- Be specific with names, numbers, and positioning.\n- Give a real opinion on who wins and why.\n- Max 420 words.`,
        `Analyze the competitive landscape for: ${t}\n\nSources:\n${sources}\n\nCover: what ${t} does and who it targets, who the top 3-4 competitors are and how each positions against them, where ${t} has a genuine edge, where competitors are stronger, and which competitor is the real threat. End with a one-sentence strategic verdict.\n\nProse only. Bold labels per section. No lists or headers.`,
        1800,
        onChunk
      );
    }

    case "investor-research": {
      const [profileRes, portfolioRes, thesisRes] = await Promise.all([
        firecrawl.search(`${t} investor background thesis focus areas`, { limit: 3 }),
        firecrawl.search(`${t} portfolio investments funded startups`, { limit: 4 }),
        firecrawl.search(`${t} recent investments 2024 2025 check size stage`, { limit: 3 }),
      ]);
      const sources = mapSources([...(profileRes.web ?? []), ...(portfolioRes.web ?? []), ...(thesisRes.web ?? [])]);
      return streamClaude(
        `You are a senior VC analyst writing a pre-pitch brief. Write like a founder who's done deep research — sharp, specific, useful for walking into a meeting.\n\nRules:\n- Prose only. No bullet points. No dashes. No ## headers.\n- Bold labels like **Their thesis.** start each section.\n- Include real portfolio companies, check sizes, and stage preferences where available.\n- End with 2 specific reasons why this investor might say yes, and 1 reason they might pass.\n- Max 380 words.`,
        `Research this investor or VC firm for a founder preparing to pitch: ${t}\n\nSources:\n${sources}\n\nCover: who they are and their background, their investment thesis and focus areas, notable portfolio companies, typical check size and stage, what they consistently look for in founders, and your honest assessment of fit.\n\nProse only. Bold labels. No lists.`,
        1400,
        onChunk
      );
    }

    case "lead-enrichment": {
      const [profileRes, recentRes] = await Promise.all([
        firecrawl.search(`${t} LinkedIn profile role background`, { limit: 3 }),
        firecrawl.search(`${t} recent news interviews 2024 2025`, { limit: 3 }),
      ]);
      const sources = mapSources([...(profileRes.web ?? []), ...(recentRes.web ?? [])]);
      return streamClaude(
        `You are a senior BD researcher. You write like a smart colleague briefing you before an important meeting — direct, useful, zero fluff.\n\nRules you never break:\n- Write in clean flowing prose. No bullet points. No dashes. No numbered lists.\n- Never use markdown headers like ## or ###. Never.\n- Start each topic with a bold label and period: **Who they are.** Then prose.\n- Be specific. Use real titles, companies, dates.\n- For outreach angles, write them as actual opening lines you'd send — not categories.\n- End with a relevance score out of 10 and one sentence why.\n- Maximum 300 words total.`,
        `Lead to enrich: ${t}\n\nSources:\n${sources}\n\nWrite a lead brief covering: who this person is and their current role, their career background, what they're focused on right now, 2-3 specific outreach angles written as actual opening lines, and how to reach them. End with a relevance score.\n\nProse only. Bold labels per topic. No lists, headers, or dashes.`,
        1200,
        onChunk
      );
    }

    case "startup-validator": {
      const [marketRes, competitorRes, trendsRes] = await Promise.all([
        firecrawl.search(`${t} market size opportunity TAM 2024 2025`, { limit: 3 }),
        firecrawl.search(`${t} existing companies startups competitors`, { limit: 4 }),
        firecrawl.search(`${t} trends growth demand problems pain points`, { limit: 3 }),
      ]);
      const sources = mapSources([...(marketRes.web ?? []), ...(competitorRes.web ?? []), ...(trendsRes.web ?? [])]);
      return streamClaude(
        `You are a YC partner giving brutally honest feedback on a startup idea. Write like Paul Graham — direct, no fluff, no encouragement that isn't earned.\n\nRules:\n- Prose only. No bullet points. No dashes. No ## headers.\n- Bold labels like **The market.** start each section.\n- Be honest. If the idea is crowded, say so. If the timing is wrong, say so.\n- Use real market data and competitor names where available.\n- End with a clear verdict: pursue, pivot, or pass — with one sentence of reasoning.\n- Max 400 words.`,
        `Validate this startup idea: ${t}\n\nSources:\n${sources}\n\nCover: what the real market opportunity looks like (with size if available), who's already doing this and how funded they are, what the genuine pain point is and whether it's acute enough, the biggest risk to this idea, and whether there's a defensible angle. End with your verdict.\n\nProse only. Bold labels. No lists or headers.`,
        1600,
        onChunk
      );
    }

    case "roast-startup": {
      const [existingRes, fundingRes] = await Promise.all([
        firecrawl.search(`${t} startup company existing competitors`, { limit: 4 }),
        firecrawl.search(`${t} VC funding raised Series`, { limit: 3 }),
      ]);
      const sources = mapSources([...(existingRes.web ?? []), ...(fundingRes.web ?? [])]);
      return streamClaude(
        `You are a brutally funny, sharp startup critic — part YC partner, part comedian. You roast startup ideas like a seasoned investor who has seen it all. Be specific, be funny, be honest. Don't be mean for its own sake — the roast should be so accurate it stings.\n\nRules:\n- Prose only. No bullet points. No dashes. No ## headers.\n- Bold labels like **The crowded reality.** start each section.\n- Be specific — name real competitors, real funded companies, real reasons why this is hard.\n- Use dry wit. One well-placed joke lands better than ten punchlines.\n- End with a "Verdict" — one sentence on whether this is doomed, a pivot away from something good, or actually interesting despite the roast.\n- Max 350 words.`,
        `Roast this startup idea: ${t}\n\nResearch context:\n${sources}\n\nCover: who's already doing this (and how funded they are), what the fatal flaw is, what the founder is probably getting wrong, and whether there's anything salvageable. End with a one-sentence verdict.\n\nProse only. Bold labels. No lists or headers.`,
        1200,
        onChunk
      );
    }

    case "cold-email": {
      const [profileRes, companyRes, recentRes] = await Promise.all([
        firecrawl.search(`${t} LinkedIn background career`, { limit: 3 }),
        firecrawl.search(`${t} company product news 2025`, { limit: 3 }),
        firecrawl.search(`${t} recent interview blog post 2024 2025`, { limit: 2 }),
      ]);
      const sources = [...(profileRes.web ?? []), ...(companyRes.web ?? []), ...(recentRes.web ?? [])]
        .map((r) => { const item = r as { title?: string; description?: string }; return `${item.title || ""}: ${item.description || ""}`; })
        .join("\n\n");
      return streamClaude(
        `You are a world-class cold email writer. You write emails that get replies — specific, human, no fluff.\n\nRules:\n- Output the email exactly as it should be sent — Subject line first, then body\n- No preamble, just the email itself\n- Subject line: under 8 words, curiosity-driven, no clickbait\n- Opening: reference something specific and real about them\n- Body: 3-4 sentences max. One clear value prop. One specific ask.\n- CTA: one question or one specific action, never two\n- PS line: optional, make it land\n- No em dashes. Sound like a smart human.\n- Format: Subject: [line]\n\n[body]`,
        `Write a cold email to: ${t}\n\nResearch context:\n${sources}\n\nWrite a cold email that will get a reply. Be specific to this person.`,
        1200,
        onChunk
      );
    }

    case "hn-pulse": {
      const query = encodeURIComponent(t);
      const [storiesRes, commentsRes] = await Promise.all([
        fetch(`https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=10`),
        fetch(`https://hn.algolia.com/api/v1/search?query=${query}&tags=comment&hitsPerPage=15`),
      ]);
      const [storiesData, commentsData] = await Promise.all([storiesRes.json(), commentsRes.json()]);
      interface HNHit { objectID: string; title?: string; story_text?: string; comment_text?: string; url?: string; points?: number; num_comments?: number; author?: string; }
      const stories: HNHit[] = storiesData.hits ?? [];
      const comments: HNHit[] = commentsData.hits ?? [];
      const storyContext = stories.slice(0, 8).map(s =>
        `STORY [${s.points ?? 0} pts, ${s.num_comments ?? 0} comments]: "${s.title || ""}"\nURL: ${s.url || `https://news.ycombinator.com/item?id=${s.objectID}`}`
      ).join("\n\n---\n\n");
      const commentContext = comments.slice(0, 10).map(c =>
        `COMMENT by ${c.author || "anon"}: "${(c.comment_text || "").replace(/<[^>]*>/g, "").slice(0, 300)}"`
      ).join("\n\n");
      return streamClaude(
        `You are a Hacker News analyst. You read the technical community's pulse with precision.\n\nRules:\n- Prose only. No bullet points. No ## headers.\n- Bold labels like **What HN thinks.** start each section.\n- Be specific — quote actual comments, cite real thread titles, mention point counts.\n- End with a "Community verdict" — one sentence.\n- Max 380 words.`,
        `Analyze Hacker News sentiment for: "${t}"\n\nTotal HN stories found: ${storiesData.nbHits ?? 0}\n\nTop stories:\n${storyContext || "No major stories found."}\n\nSample community comments:\n${commentContext || "No significant comment threads found."}\n\nWrite a HN Pulse report. Cover what the community is saying, overall sentiment, most interesting threads, and what the activity level signals.`,
        1400,
        onChunk
      );
    }

    case "github-intel": {
      const cleaned = t.replace(/\/$/, "");
      const urlMatch = cleaned.match(/github\.com\/([^/]+)\/([^/\s]+)/);
      const shortMatch = cleaned.match(/^([^/\s]+)\/([^/\s]+)$/);
      const parsed = urlMatch ? { owner: urlMatch[1], repo: urlMatch[2] } : shortMatch ? { owner: shortMatch[1], repo: shortMatch[2] } : null;
      if (!parsed) throw new Error("Invalid GitHub URL or owner/repo format");
      const { owner, repo } = parsed;
      const base = `https://api.github.com/repos/${owner}/${repo}`;
      const ghHeaders: Record<string, string> = { "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
      if (process.env.GITHUB_TOKEN) ghHeaders["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
      const ghFetch = async (url: string) => { const r = await fetch(url, { headers: ghHeaders }); return r.ok ? r.json() : null; };
      const [repoData, contributors, languages, commits, releases] = await Promise.all([
        ghFetch(base), ghFetch(`${base}/contributors?per_page=10`), ghFetch(`${base}/languages`),
        ghFetch(`${base}/commits?per_page=15`), ghFetch(`${base}/releases?per_page=5`),
      ]);
      if (!repoData) throw new Error("Repository not found or is private");
      const languageList = languages ? Object.entries(languages as Record<string, number>).sort(([,a],[,b]) => b-a).map(([lang]) => lang).join(", ") : "Unknown";
      const topContributors = (contributors as Array<{ login: string; contributions: number }> | null)?.slice(0,5).map(c => `@${c.login} (${c.contributions})`).join(", ") || "No data";
      const recentCommits = (commits as Array<{ commit: { message: string; author: { date: string } } }> | null)?.slice(0,8).map(c => `- ${c.commit.message.split("\n")[0].slice(0,80)} (${c.commit.author?.date?.slice(0,10)})`).join("\n") || "No recent commits";
      const latestRelease = (releases as Array<{ tag_name: string; published_at: string; name: string }> | null)?.[0];
      const context = `Repository: ${owner}/${repo}\nDescription: ${repoData.description || "None"}\nStars: ${repoData.stargazers_count} | Forks: ${repoData.forks_count}\nOpen Issues: ${repoData.open_issues_count}\nLanguages: ${languageList}\nCreated: ${repoData.created_at?.slice(0,10)} | Last Push: ${repoData.pushed_at?.slice(0,10)}\nLicense: ${repoData.license?.name || "None"}\nArchived: ${repoData.archived ? "YES" : "No"}\nTop contributors: ${topContributors}\nLatest release: ${latestRelease ? `${latestRelease.tag_name} (${latestRelease.published_at?.slice(0,10)})` : "No releases"}\nRecent commits:\n${recentCommits}`;
      return streamClaude(
        `You are a senior engineering analyst who reads GitHub repos like a doctor reading a patient chart.\n\nRules:\n- Prose only. No bullet points. No ## headers.\n- Bold labels like **Project health.** start each section.\n- Be specific with numbers — stars, commit velocity, contributor count.\n- Assess bus factor honestly.\n- End with a "Repo verdict" — one sentence.\n- Max 420 words.`,
        `Analyze this GitHub repository: ${owner}/${repo}\n\n${context}\n\nCover: what this project does, health and momentum, bus factor risk, what recent commits reveal, and the tech stack. End with your repo verdict.`,
        1600,
        onChunk
      );
    }

    case "tos-analyzer": {
      let tosContent = "";
      const isUrl = t.startsWith("http://") || t.startsWith("https://");
      if (isUrl) {
        try {
          const scraped = await (firecrawl as unknown as { scrapeUrl: (url: string, opts: object) => Promise<{ markdown?: string }> }).scrapeUrl(t, { formats: ["markdown"] });
          tosContent = scraped.markdown?.slice(0, 8000) || "";
        } catch { /* fallback */ }
      }
      if (!tosContent) {
        const [tosRes, privacyRes] = await Promise.all([
          firecrawl.search(`${t} terms of service user agreement`, { limit: 3 }),
          firecrawl.search(`${t} privacy policy data collection`, { limit: 3 }),
        ]);
        tosContent = [...(tosRes.web ?? []), ...(privacyRes.web ?? [])]
          .map((r) => { const item = r as { title?: string; description?: string }; return `${item.title || ""}: ${item.description || ""}`; })
          .join("\n\n");
      }
      if (!tosContent.trim()) throw new Error("Could not retrieve Terms of Service for this URL.");
      return streamClaude(
        `You are a plain-English legal analyst. You read Terms of Service and tell people exactly what they agreed to.\n\nRules:\n- Prose only. No bullet points. No ## headers.\n- Bold labels like **What they collect.** start each section.\n- Don't sugarcoat red flags.\n- Rate each area: 🟢 fair / 🟡 watch out / 🔴 red flag\n- End with an "Overall verdict" — one sentence.\n- Max 420 words.`,
        `Analyze the Terms of Service for: ${t}\n\nTOS/Privacy content:\n${tosContent}\n\nCover: data collection, what they can do with your data, account termination, arbitration clauses, auto-renewal, and biggest red flags. Use emoji ratings. End with your verdict.`,
        1600,
        onChunk
      );
    }

    case "job-board-intel": {
      const company = t;
      const [jobsRes, careersRes, linkedinRes] = await Promise.all([
        firecrawl.search(`${company} jobs hiring 2025 site:greenhouse.io OR site:lever.co OR site:ashbyhq.com`, { limit: 5 }),
        firecrawl.search(`${company} careers open roles engineering product 2025`, { limit: 4 }),
        firecrawl.search(`${company} hiring LinkedIn jobs engineering design`, { limit: 3 }),
      ]);
      const sources = [...(jobsRes.web ?? []), ...(careersRes.web ?? []), ...(linkedinRes.web ?? [])]
        .map((r) => { const item = r as { url?: string; title?: string; description?: string }; return `LISTING: ${item.title || ""}\n${item.description || ""}\nURL: ${item.url || ""}`; })
        .join("\n\n---\n\n");
      return streamClaude(
        `You are a competitive intelligence analyst who reads job postings like a seasoned investor reads financial statements.\n\nRules:\n- Prose only. No bullet points. No ## headers.\n- Bold labels like **What they're building.** start each section.\n- Be specific — name actual roles, infer from job titles what product decisions they've made.\n- End with a "Strategic read" — one sentence on what this hiring pattern reveals about their next 12 months.\n- Max 420 words.`,
        `Analyze the job postings and hiring activity for: ${company}\n\nJob listings found:\n${sources || "No direct job listings found — infer from any available signals."}\n\nWrite a Job Board Intelligence report. What are they hiring most heavily? What does the role mix say about their product roadmap? End with your strategic read.`,
        1600,
        onChunk
      );
    }

    default:
      throw new Error(`Unknown agent: ${agentId}`);
  }
}

"use client";

import { useEffect, useState } from "react";

const ACTIVITIES = [
  { icon: "📊", agent: "Due Diligence", subject: "Anthropic", time: 2 },
  { icon: "🔍", agent: "Web Research", subject: "AI agent market 2025", time: 8 },
  { icon: "🎯", agent: "Lead Enrichment", subject: "Jensen Huang, NVIDIA", time: 15 },
  { icon: "📊", agent: "Due Diligence", subject: "Mistral AI", time: 23 },
  { icon: "🔍", agent: "Web Research", subject: "YC W25 batch companies", time: 31 },
  { icon: "🎯", agent: "Lead Enrichment", subject: "Dario Amodei, Anthropic", time: 44 },
  { icon: "📊", agent: "Due Diligence", subject: "ElevenLabs", time: 52 },
  { icon: "🔍", agent: "Web Research", subject: "Coinbase AgentKit overview", time: 67 },
  { icon: "🎯", agent: "Lead Enrichment", subject: "Garry Tan, YC", time: 78 },
  { icon: "📊", agent: "Due Diligence", subject: "Perplexity AI", time: 94 },
];

type Activity = { icon: string; agent: string; subject: string; time: number; id: number };

export default function ActivityFeed() {
  const [items, setItems] = useState<Activity[]>([]);

  useEffect(() => {
    // Seed with a few items
    const seed = ACTIVITIES.slice(0, 4).map((a, i) => ({ ...a, id: i }));
    setItems(seed);

    let counter = 100;
    const interval = setInterval(() => {
      const next = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
      setItems(prev => [{ ...next, time: 0, id: counter++ }, ...prev].slice(0, 6));
    }, 3500);

    // Increment times
    const ticker = setInterval(() => {
      setItems(prev => prev.map(a => ({ ...a, time: a.time + 1 })));
    }, 1000);

    return () => { clearInterval(interval); clearInterval(ticker); };
  }, []);

  function formatTime(s: number) {
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div
          key={item.id}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs transition-all duration-500"
          style={{
            background: i === 0 ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.025)",
            border: i === 0 ? "1px solid rgba(124,58,237,0.2)" : "1px solid rgba(255,255,255,0.06)",
            opacity: 1 - i * 0.15,
            transform: `scale(${1 - i * 0.015})`,
          }}
        >
          <span className="text-base shrink-0">{item.icon}</span>
          <div className="flex-1 min-w-0">
            <span className="text-zinc-500">{item.agent} · </span>
            <span className="text-zinc-300 font-medium truncate">{item.subject}</span>
          </div>
          <span className="text-zinc-700 shrink-0 font-mono">{formatTime(item.time)}</span>
          {i === 0 && (
            <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0 inline-block" />
          )}
        </div>
      ))}
    </div>
  );
}

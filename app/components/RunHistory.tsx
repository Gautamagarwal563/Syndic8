"use client";

import { useEffect, useState } from "react";

export interface HistoryItem {
  id: string;
  agentId: string;
  agentName: string;
  icon: string;
  input: string;
  result: string;
  timestamp: number;
  paid: boolean;
}

const STORAGE_KEY = "syndic8_history";

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  function addRun(item: Omit<HistoryItem, "id" | "timestamp">) {
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now(),
    };
    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 20);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  function clearHistory() {
    setHistory([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  return { history, addRun, clearHistory };
}

interface Props {
  agentId: string;
  onSelect: (item: HistoryItem) => void;
}

export default function RunHistory({ agentId, onSelect }: Props) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const all: HistoryItem[] = JSON.parse(stored);
        setHistory(all.filter(h => h.agentId === agentId));
      }
    } catch {}
  }, [agentId]);

  if (history.length === 0) return null;

  function timeAgo(ts: number) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-2"
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>Recent runs ({history.length})</span>
      </button>

      {open && (
        <div className="space-y-2">
          {history.map(item => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full text-left rounded-xl px-4 py-3 transition-all duration-200 group"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-400 group-hover:text-white transition-colors truncate max-w-[80%]">
                  {item.input}
                </span>
                <span className="text-[10px] text-zinc-700 shrink-0 ml-2">{timeAgo(item.timestamp)}</span>
              </div>
              <p className="text-[11px] text-zinc-600 truncate">
                {item.result.slice(0, 80)}…
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

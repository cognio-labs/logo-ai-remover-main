/**
 * Local (browser) history store for processed files.
 *
 * TODO(real AI/backend): swap localStorage for the user's server-side job list
 * (GET /api/jobs) once accounts exist. The HistoryItem shape already matches.
 */
import { useEffect, useState } from "react";
import type { HistoryItem } from "./pipeline";

const KEY = "pixelrefine.history.v1";
const listeners = new Set<(items: HistoryItem[]) => void>();

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function persist(items: HistoryItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode — history stays in memory for this session */
  }
  listeners.forEach((l) => l(items));
}

export function addHistory(item: HistoryItem) {
  persist([item, ...loadHistory()].slice(0, 60));
}

export function removeHistory(id: string) {
  persist(loadHistory().filter((i) => i.id !== id));
}

export function clearHistory() {
  persist([]);
}

/** Reactive history list (empty during SSR, hydrates on mount). */
export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setItems(loadHistory());
    const l = (next: HistoryItem[]) => setItems(next);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return items;
}

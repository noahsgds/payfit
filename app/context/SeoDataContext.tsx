"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SerpResult {
  keyword: string;
  position: number | null;
  url: string | null;
  title: string | null;
}

export interface SeoData {
  timestamp: string | null;
  trends: { labels: string[]; series: Record<string, number[]> };
  serp: SerpResult[];
  serpRunFinishedAt: string | null;
  serpError: string | null;
}

interface SeoDataContextValue {
  seoData: SeoData | null;
  loading: boolean;
  polling: boolean;
  pollSeconds: number;
  triggerRefresh: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SeoDataContext = createContext<SeoDataContextValue | null>(null);

export function SeoDataProvider({ children }: { children: ReactNode }) {
  const [seoData, setSeoData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [pollSeconds, setPollSeconds] = useState(0);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch initial data once on mount
  useEffect(() => {
    fetch("/api/seo-data")
      .then((r) => r.json())
      .then((d: SeoData) => setSeoData(d))
      .catch(() => setSeoData(null))
      .finally(() => setLoading(false));

    return () => stopPolling();
  }, []);

  function stopPolling() {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  }

  function startPolling(runId: string) {
    setPolling(true);
    setPollSeconds(0);
    let elapsed = 0;

    pollInterval.current = setInterval(async () => {
      elapsed += 5;
      setPollSeconds(elapsed);

      try {
        const res = await fetch(`/api/serp-status?runId=${runId}`);
        const json = await res.json() as {
          status: string;
          serp?: SerpResult[];
          finishedAt?: string;
        };

        if (json.status === "SUCCEEDED" && json.serp) {
          stopPolling();
          setPolling(false);
          setSeoData((prev) =>
            prev
              ? { ...prev, serp: json.serp!, serpRunFinishedAt: json.finishedAt ?? null }
              : prev
          );
        } else if (json.status === "FAILED" || json.status === "ABORTED") {
          stopPolling();
          setPolling(false);
        }
      } catch {
        // réseau instable, on réessaie au prochain tick
      }
    }, 5000);
  }

  const triggerRefresh = useCallback(async () => {
    stopPolling();
    setPolling(true);
    setPollSeconds(0);

    try {
      const res = await fetch("/api/serp-refresh", { method: "POST" });
      const json = await res.json() as { runId?: string; error?: string };
      if (json.runId) {
        startPolling(json.runId);
      } else {
        setPolling(false);
      }
    } catch {
      setPolling(false);
    }
  }, []);

  return (
    <SeoDataContext.Provider value={{ seoData, loading, polling, pollSeconds, triggerRefresh }}>
      {children}
    </SeoDataContext.Provider>
  );
}

export function useSeoData() {
  const ctx = useContext(SeoDataContext);
  if (!ctx) throw new Error("useSeoData must be used inside SeoDataProvider");
  return ctx;
}

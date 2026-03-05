"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
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
  serpError: string | null;
}

interface SeoDataContextValue {
  seoData: SeoData | null;
  loading: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SeoDataContext = createContext<SeoDataContextValue | null>(null);

export function SeoDataProvider({ children }: { children: ReactNode }) {
  const [seoData, setSeoData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/seo-data")
      .then((r) => r.json())
      .then((d: SeoData) => setSeoData(d))
      .catch(() => setSeoData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SeoDataContext.Provider value={{ seoData, loading }}>
      {children}
    </SeoDataContext.Provider>
  );
}

export function useSeoData() {
  const ctx = useContext(SeoDataContext);
  if (!ctx) throw new Error("useSeoData must be used inside SeoDataProvider");
  return ctx;
}

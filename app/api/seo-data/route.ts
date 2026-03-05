import { NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const googleTrends = require("google-trends-api") as {
  interestOverTime: (opts: {
    keyword: string;
    geo: string;
    startTime: Date;
  }) => Promise<string>;
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 heure

const TRENDS_KEYWORDS = [
  "PayFit",
  "logiciel paie",
  "logiciel RH",
  "logiciel SIRH",
  "bulletin de paie",
  "fiche de paie",
];

// ─── In-memory cache ───────────────────────────────────────────────────────────
let cache: { data: unknown; ts: number } | null = null;

// ─── Google Trends ─────────────────────────────────────────────────────────────

async function fetchGoogleTrends() {
  try {
    const results = await Promise.all(
      TRENDS_KEYWORDS.map((keyword) =>
        googleTrends
          .interestOverTime({
            keyword,
            geo: "FR",
            startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          })
          .then((res: string) => {
            const parsed = JSON.parse(res);
            return (parsed?.default?.timelineData ?? []) as Array<{
              time: string;
              value?: number[];
            }>;
          })
          .catch(() => [] as Array<{ time: string; value?: number[] }>)
      )
    );

    const timeline = results[0];
    if (!timeline.length) return { labels: [], series: {} };

    const labels = timeline.map((p) => {
      const d = new Date(parseInt(p.time) * 1000);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });

    const series: Record<string, number[]> = {};
    TRENDS_KEYWORDS.forEach((kw, i) => {
      series[kw] = (results[i] ?? []).map((p: { value?: number[] }) => p.value?.[0] ?? 0);
    });

    return { labels, series };
  } catch {
    return { labels: [], series: {} };
  }
}

// ─── GET /api/seo-data ─────────────────────────────────────────────────────────

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  const trends = await fetchGoogleTrends();

  const data = {
    timestamp: new Date().toISOString(),
    trends,
  };

  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}

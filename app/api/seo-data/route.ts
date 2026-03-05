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

export const TRACKED_KEYWORDS = [
  "fiche de paie",
  "bulletin de paie",
  "comprendre sa fiche de paie",
  "faire une fiche de paie",
  "calcul des congés payés",
  "document d'embauche",
  "logiciel de paie gratuit",
  "gestion du personnel",
  "SIRH",
];

const TRENDS_KEYWORDS = ["PayFit", "logiciel paie", "logiciel RH"];

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

// ─── Serper.dev SERP ───────────────────────────────────────────────────────────

interface SerperOrganic {
  position: number;
  title: string;
  link: string;
}

async function fetchSerperSerp() {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const results = await Promise.all(
    TRACKED_KEYWORDS.map(async (keyword) => {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: keyword, gl: "fr", hl: "fr", num: 100 }),
      });

      if (!res.ok) return { keyword, position: null, url: null, title: null };

      const data = await res.json() as { organic?: SerperOrganic[] };
      const payfit = (data.organic ?? []).find((r) => r.link?.includes("payfit.com"));

      return {
        keyword,
        position: payfit?.position ?? null,
        url: payfit?.link ?? null,
        title: payfit?.title ?? null,
      };
    })
  );

  return results;
}

// ─── GET /api/seo-data ─────────────────────────────────────────────────────────

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  const [trends, serp] = await Promise.allSettled([
    fetchGoogleTrends(),
    fetchSerperSerp(),
  ]);

  const data = {
    timestamp: new Date().toISOString(),
    trends:
      trends.status === "fulfilled" ? trends.value : { labels: [], series: {} },
    serp: serp.status === "fulfilled" ? serp.value : [],
    serpError:
      serp.status === "rejected"
        ? String((serp as PromiseRejectedResult).reason)
        : null,
  };

  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}

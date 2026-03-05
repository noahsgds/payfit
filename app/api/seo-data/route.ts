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

const ACTOR_ID = "scraperlink~google-search-results-serp-scraper";

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

// ─── Apify SERP — lit le dernier run (pas de déclenchement synchrone) ─────────

interface ApifyResult {
  position: number;
  url: string;
  title: string;
  description: string;
}

interface ApifyPage {
  page_number: number;
  search_term: string;
  results: ApifyResult[];
}

export async function fetchLastApifyRun(): Promise<{
  serp: { keyword: string; position: number | null; url: string | null; title: string | null }[];
  runStatus: string | null;
  runFinishedAt: string | null;
}> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return { serp: [], runStatus: null, runFinishedAt: null };

  // 1. Récupère le dernier run SUCCEEDED
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs/last?token=${token}&status=SUCCEEDED`
  );

  if (!runRes.ok) {
    throw new Error(`Apify last run: HTTP ${runRes.status}`);
  }

  const runData = await runRes.json() as {
    data?: { defaultDatasetId?: string; status?: string; finishedAt?: string };
  };

  const datasetId = runData?.data?.defaultDatasetId;
  const runStatus = runData?.data?.status ?? null;
  const runFinishedAt = runData?.data?.finishedAt ?? null;

  if (!datasetId) return { serp: [], runStatus, runFinishedAt };

  // 2. Lit les items du dataset
  const dsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`
  );

  if (!dsRes.ok) throw new Error(`Apify dataset: HTTP ${dsRes.status}`);

  const pages: ApifyPage[] = await dsRes.json();

  const serp = TRACKED_KEYWORDS.map((keyword) => {
    const kwPages = pages.filter(
      (p) => p.search_term?.toLowerCase() === keyword.toLowerCase()
    );

    const allResults = kwPages.flatMap((p) =>
      (p.results ?? []).map((r) => ({
        ...r,
        absolutePosition: (p.page_number - 1) * 10 + r.position,
      }))
    );

    const payfit = allResults.find((r) => r.url?.includes("payfit.com"));

    return {
      keyword,
      position: payfit?.absolutePosition ?? null,
      url: payfit?.url ?? null,
      title: payfit?.title ?? null,
    };
  });

  return { serp, runStatus, runFinishedAt };
}

// ─── GET /api/seo-data ─────────────────────────────────────────────────────────

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  const [trends, serpResult] = await Promise.allSettled([
    fetchGoogleTrends(),
    fetchLastApifyRun(),
  ]);

  const serpValue =
    serpResult.status === "fulfilled" ? serpResult.value : null;

  const data = {
    timestamp: new Date().toISOString(),
    trends:
      trends.status === "fulfilled"
        ? trends.value
        : { labels: [], series: {} },
    serp: serpValue?.serp ?? [],
    serpRunStatus: serpValue?.runStatus ?? null,
    serpRunFinishedAt: serpValue?.runFinishedAt ?? null,
    serpError:
      serpResult.status === "rejected"
        ? String((serpResult as PromiseRejectedResult).reason)
        : null,
  };

  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}

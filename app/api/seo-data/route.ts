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

const TRACKED_KEYWORDS = [
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

// ─── In-memory cache (persiste tant que l'instance Vercel est chaude) ──────────
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

// ─── Apify SERP ────────────────────────────────────────────────────────────────

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

async function fetchApifySerp() {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];

  const res = await fetch(
    `https://api.apify.com/v2/acts/scraperlink~google-search-results-serp-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // L'acteur attend une chaîne séparée par des retours à la ligne
        queries: TRACKED_KEYWORDS.join("\n"),
        countryCode: "fr",
        languageCode: "fr",
        maxItems: TRACKED_KEYWORDS.length * 10,
      }),
    }
  );

  if (!res.ok) throw new Error(`Apify ${res.status}`);

  // Chaque item = une page de résultats pour un keyword
  const pages: ApifyPage[] = await res.json();

  return TRACKED_KEYWORDS.map((keyword) => {
    const kwPages = pages.filter(
      (p) => p.search_term?.toLowerCase() === keyword.toLowerCase()
    );

    // Aplatir les résultats avec la position absolue
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
}

// ─── GET /api/seo-data ─────────────────────────────────────────────────────────

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  const [trends, serp] = await Promise.allSettled([
    fetchGoogleTrends(),
    fetchApifySerp(),
  ]);

  const data = {
    timestamp: new Date().toISOString(),
    trends:
      trends.status === "fulfilled"
        ? trends.value
        : { labels: [], series: {} },
    serp: serp.status === "fulfilled" ? serp.value : [],
  };

  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}

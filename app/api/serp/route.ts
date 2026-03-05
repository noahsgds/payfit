import { NextResponse } from "next/server";

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

export interface SerperOrganic {
  position: number;
  title: string;
  link: string;
  snippet?: string;
}

export interface SerpKeywordData {
  keyword: string;
  position: number | null;
  url: string | null;
  title: string | null;
  snippet: string | null;
  competitorsAbove: string[];
}

export interface SerpApiResponse {
  results: SerpKeywordData[];
  fetchedAt: string;
}

async function fetchPage(apiKey: string, keyword: string, page: number): Promise<SerperOrganic[]> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: keyword, gl: "fr", hl: "fr", num: 100, page }),
  });
  if (!res.ok) return [];
  const data = await res.json() as { organic?: SerperOrganic[] };
  const offset = (page - 1) * 100;
  return (data.organic ?? []).map((r) => ({ ...r, position: r.position + offset }));
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ─── POST /api/serp ────────────────────────────────────────────────────────────

export async function POST() {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "SERPER_API_KEY manquante" }, { status: 500 });
  }

  const results = await Promise.all(
    TRACKED_KEYWORDS.map(async (keyword): Promise<SerpKeywordData> => {
      try {
        const [page1, page2] = await Promise.all([
          fetchPage(apiKey, keyword, 1),
          fetchPage(apiKey, keyword, 2),
        ]);
        const all = [...page1, ...page2];
        const payfitIdx = all.findIndex((r) => r.link?.includes("payfit.com"));
        const payfit = payfitIdx >= 0 ? all[payfitIdx] : null;

        const competitorsAbove =
          payfitIdx > 0
            ? [...new Set(all.slice(0, payfitIdx).map((r) => extractDomain(r.link)))]
            : [];

        return {
          keyword,
          position: payfit?.position ?? null,
          url: payfit?.link ?? null,
          title: payfit?.title ?? null,
          snippet: payfit?.snippet ?? null,
          competitorsAbove,
        };
      } catch {
        return { keyword, position: null, url: null, title: null, snippet: null, competitorsAbove: [] };
      }
    })
  );

  return NextResponse.json({ results, fetchedAt: new Date().toISOString() } satisfies SerpApiResponse);
}

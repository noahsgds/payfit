import { NextResponse } from "next/server";
import { TRACKED_KEYWORDS } from "../seo-data/route";

const ACTOR_ID = "scraperlink~google-search-results-serp-scraper";

// POST /api/serp-refresh
// Déclenche un nouveau run Apify en mode async (pas de timeout)
export async function POST() {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "APIFY_TOKEN manquant" }, { status: 500 });
  }

  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queries: TRACKED_KEYWORDS.join("\n"),
        countryCode: "fr",
        languageCode: "fr",
        maxItems: TRACKED_KEYWORDS.length * 10,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Apify ${res.status}`, detail: text }, { status: 500 });
  }

  const run = await res.json() as { data?: { id?: string; status?: string } };

  return NextResponse.json({
    runId: run.data?.id,
    status: run.data?.status,
    message: "Run lancé. Les résultats seront disponibles dans ~2 minutes.",
  });
}

import { NextResponse } from "next/server";

// GET /api/apify-debug
// Retourne les 3 premiers items bruts d'Apify pour inspecter la structure des champs
export async function GET() {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "APIFY_TOKEN manquant" }, { status: 500 });
  }

  const res = await fetch(
    `https://api.apify.com/v2/acts/scraperlink~google-search-results-serp-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queries: ["logiciel de paie"],
        countryCode: "fr",
        languageCode: "fr",
        maxItems: 10,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Apify ${res.status}`, body: text }, { status: 500 });
  }

  const items: Array<Record<string, unknown>> = await res.json();

  return NextResponse.json({
    total: items.length,
    keys: items[0] ? Object.keys(items[0]) : [],
    items: items.slice(0, 5),
  });
}

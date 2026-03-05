import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "APIFY_TOKEN manquant" }, { status: 500 });
  }

  const input = {
    queries: "fiche de paie\nbulletin de paie",
    countryCode: "fr",
    languageCode: "fr",
    maxItems: 20,
  };

  let res: Response;
  try {
    res = await fetch(
      `https://api.apify.com/v2/acts/scraperlink~google-search-results-serp-scraper/run-sync-get-dataset-items?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );
  } catch (err) {
    return NextResponse.json({ error: "fetch failed", detail: String(err) }, { status: 500 });
  }

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Apify HTTP ${res.status}`, body: text, input },
      { status: 500 }
    );
  }

  const items: unknown[] = await res.json();
  const first = items[0] as Record<string, unknown> | undefined;

  return NextResponse.json({
    input_sent: input,
    total_items: items.length,
    keys_in_first_item: first ? Object.keys(first) : [],
    first_3_items: items.slice(0, 3),
  });
}

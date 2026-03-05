import { NextRequest, NextResponse } from "next/server";
import { TRACKED_KEYWORDS } from "../seo-data/route";

interface ApifyResult {
  position: number;
  url: string;
}

interface ApifyPage {
  page_number: number;
  search_term: string;
  results: ApifyResult[];
}

// GET /api/serp-status?runId=xxx
// Retourne { status: "RUNNING"|"SUCCEEDED"|"FAILED", serp? }
export async function GET(req: NextRequest) {
  const token = process.env.APIFY_TOKEN;
  const runId = req.nextUrl.searchParams.get("runId");

  if (!token || !runId) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const runRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
  );

  if (!runRes.ok) {
    return NextResponse.json({ error: `Apify ${runRes.status}` }, { status: 500 });
  }

  const run = await runRes.json() as {
    data?: { status?: string; defaultDatasetId?: string; finishedAt?: string };
  };

  const status = run.data?.status ?? "UNKNOWN";

  if (status !== "SUCCEEDED") {
    return NextResponse.json({ status });
  }

  // Run terminé — on lit le dataset
  const datasetId = run.data?.defaultDatasetId;
  const dsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`
  );

  if (!dsRes.ok) {
    return NextResponse.json({ status, error: `Dataset ${dsRes.status}` }, { status: 500 });
  }

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
    };
  });

  return NextResponse.json({ status, serp, finishedAt: run.data?.finishedAt });
}

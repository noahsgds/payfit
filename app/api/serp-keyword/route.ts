import { NextResponse } from "next/server";

export interface OrgResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  domain: string;
}

export interface KeywordAnalysis {
  keyword: string;
  organic: OrgResult[];        // top 10 résultats
  payfitPosition: number | null;
  fetchedAt: string;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ─── POST /api/serp-keyword ────────────────────────────────────────────────────

export async function POST(req: Request) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "SERPER_API_KEY manquante" }, { status: 500 });
  }

  const body = await req.json() as { keyword?: string };
  const keyword = body.keyword?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "keyword manquant" }, { status: 400 });
  }

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: keyword, gl: "fr", hl: "fr", num: 100 }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Serper HTTP ${res.status}` }, { status: 502 });
  }

  const data = await res.json() as {
    organic?: Array<{ position: number; title: string; link: string; snippet?: string }>;
  };

  const raw = data.organic ?? [];

  const organic: OrgResult[] = raw.slice(0, 10).map((r) => ({
    position: r.position,
    title: r.title,
    link: r.link,
    snippet: r.snippet ?? "",
    domain: extractDomain(r.link),
  }));

  const payfitResult = raw.find((r) => r.link?.includes("payfit.com"));
  const payfitPosition = payfitResult?.position ?? null;

  return NextResponse.json({
    keyword,
    organic,
    payfitPosition,
    fetchedAt: new Date().toISOString(),
  } satisfies KeywordAnalysis);
}

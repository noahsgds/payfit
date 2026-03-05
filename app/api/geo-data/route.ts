import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Queries ─────────────────────────────────────────────────────────────────

const GEO_QUERIES = [
  { query: "Quels sont les meilleurs logiciels de paie pour PME en France ?", theme: "logiciel paie" },
  { query: "Quel SIRH choisir pour une entreprise de 50 à 200 salariés en France ?", theme: "SIRH PME" },
  { query: "Comment automatiser la gestion de la paie en entreprise ?", theme: "automatisation paie" },
  { query: "Quels outils RH recommandez-vous pour les PME françaises ?", theme: "gestion RH" },
];

const KNOWN_SOLUTIONS = [
  "payfit", "silae", "sage", "cegid", "lucca", "factorial",
  "nibelis", "eurecia", "workday", "bamboohr", "kelio", "adp",
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface EngineAnalysis {
  engine: string;
  mentioned: boolean;
  rank: number | null;
  snippet: string;
  competitors: string[];
  allMentioned: string[];
  rawResponse: string;
}

interface QueryResult {
  query: string;
  theme: string;
  engines: EngineAnalysis[];
}

interface EngineSummary {
  visibility: number;
  avgRank: number | null;
  mentions: number;
  total: number;
}

export interface GeoApiResponse {
  queries: QueryResult[];
  summary: {
    chatgpt: EngineSummary;
    gemini: EngineSummary;
  };
  timestamp: string;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

function analyzeResponse(text: string, engineName: string): EngineAnalysis {
  const lower = text.toLowerCase();
  const mentioned = lower.includes("payfit");

  // Find all solutions in order of first appearance
  const found: { name: string; pos: number }[] = [];
  for (const s of KNOWN_SOLUTIONS) {
    const idx = lower.indexOf(s);
    if (idx !== -1) found.push({ name: s, pos: idx });
  }
  found.sort((a, b) => a.pos - b.pos);

  const allMentioned = found.map((f) => f.name);
  const competitors = allMentioned.filter((n) => n !== "payfit");
  const payfitPos = found.findIndex((f) => f.name === "payfit");
  const rank = payfitPos !== -1 ? payfitPos + 1 : null;

  // Extract the sentence containing "payfit"
  let snippet = "";
  if (mentioned) {
    const match = text.match(/[^.!?\n]*[Pp]ay[Ff]it[^.!?\n]*/);
    if (match) snippet = match[0].trim().replace(/^\s*[-–•*]\s*/, "");
  }

  return { engine: engineName, mentioned, rank, snippet, competitors, allMentioned, rawResponse: text };
}

function summarize(results: EngineAnalysis[]): EngineSummary {
  const mentions = results.filter((r) => r.mentioned).length;
  const ranks = results.filter((r) => r.rank !== null).map((r) => r.rank!);
  return {
    visibility: Math.round((mentions / results.length) * 100),
    avgRank: ranks.length
      ? Math.round((ranks.reduce((a, b) => a + b, 0) / ranks.length) * 10) / 10
      : null,
    mentions,
    total: results.length,
  };
}

// ─── Cache ────────────────────────────────────────────────────────────────────

let cache: { data: GeoApiResponse; ts: number } | null = null;
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";

  if (!force && cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!openaiKey || !geminiKey) {
    return NextResponse.json({ error: "Missing API keys (OPENAI_API_KEY, GEMINI_API_KEY)" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: openaiKey });
  const genai = new GoogleGenerativeAI(geminiKey);
  const geminiModel = genai.getGenerativeModel({ model: "gemini-1.5-flash" });

  const queryResults: QueryResult[] = await Promise.all(
    GEO_QUERIES.map(async ({ query, theme }) => {
      const [gptRes, geminiRes] = await Promise.allSettled([
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: query }],
          max_tokens: 600,
        }),
        geminiModel.generateContent(query),
      ]);

      const gptText =
        gptRes.status === "fulfilled"
          ? (gptRes.value.choices[0]?.message?.content ?? "")
          : `[Erreur ChatGPT: ${(gptRes as PromiseRejectedResult).reason}]`;

      const geminiText =
        geminiRes.status === "fulfilled"
          ? geminiRes.value.response.text()
          : `[Erreur Gemini: ${(geminiRes as PromiseRejectedResult).reason}]`;

      return {
        query,
        theme,
        engines: [
          analyzeResponse(gptText, "ChatGPT"),
          analyzeResponse(geminiText, "Gemini"),
        ],
      };
    })
  );

  const chatgptResults = queryResults.flatMap((q) =>
    q.engines.filter((e) => e.engine === "ChatGPT")
  );
  const geminiResults = queryResults.flatMap((q) =>
    q.engines.filter((e) => e.engine === "Gemini")
  );

  const data: GeoApiResponse = {
    queries: queryResults,
    summary: {
      chatgpt: summarize(chatgptResults),
      gemini: summarize(geminiResults),
    },
    timestamp: new Date().toISOString(),
  };

  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}

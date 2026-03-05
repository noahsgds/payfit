import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Themes ───────────────────────────────────────────────────────────────────
// One batched prompt per engine = 2 API calls total instead of 8.

const THEMES = [
  { id: 1, theme: "logiciel paie",      label: "Logiciel de paie PME" },
  { id: 2, theme: "SIRH PME",           label: "SIRH 50-200 salariés" },
  { id: 3, theme: "automatisation paie",label: "Automatisation paie" },
  { id: 4, theme: "gestion RH",         label: "Outils RH PME" },
];

// Single prompt: forces concise answers and structured output.
const BATCH_PROMPT = `Tu es un expert en logiciels RH et paie en France.
Pour chacun des 4 thèmes, réponds en 2-3 phrases en citant les principales solutions disponibles.
Commence chaque bloc par le numéro (1. 2. 3. 4.).

1. Logiciel de paie pour PME en France
2. SIRH pour entreprise de 50 à 200 salariés
3. Automatiser la gestion de la paie en entreprise
4. Outils RH recommandés pour les PME françaises`;

const KNOWN_SOLUTIONS = [
  "payfit", "silae", "sage", "cegid", "lucca", "factorial",
  "nibelis", "eurecia", "workday", "bamboohr", "kelio", "adp", "combo",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThemeResult {
  theme: string;
  label: string;
  rawText: string;
  mentioned: boolean;
  rank: number | null;     // position of PayFit among solutions cited
  snippet: string;
  competitors: string[];   // other solutions cited in this theme
}

export interface EngineResult {
  engine: string;
  themes: ThemeResult[];
  visibility: number;      // % of themes where PayFit appears
  avgRank: number | null;
  fullResponse: string;    // raw batched response (for display)
}

export interface GeoApiResponse {
  engines: EngineResult[];
  globalVisibility: number;
  globalAvgRank: number | null;
  topCompetitors: { name: string; count: number }[];
  timestamp: string;
  cached: boolean;
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function parseThemes(text: string): string[] {
  const sections: string[] = new Array(THEMES.length).fill("");
  const parts = text.split(/\n(?=\d+[.)]\s)/);
  for (const part of parts) {
    const match = part.match(/^(\d+)[.)]\s*([\s\S]*)/);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < THEMES.length) {
        sections[idx] = match[2].trim();
      }
    }
  }
  return sections;
}

function analyzeTheme(text: string, themeId: number): ThemeResult {
  const { theme, label } = THEMES[themeId];
  const lower = text.toLowerCase();
  const mentioned = lower.includes("payfit");

  const found: { name: string; pos: number }[] = [];
  for (const s of KNOWN_SOLUTIONS) {
    const idx = lower.indexOf(s);
    if (idx !== -1) found.push({ name: s, pos: idx });
  }
  found.sort((a, b) => a.pos - b.pos);

  const competitors = found.filter((f) => f.name !== "payfit").map((f) => f.name);
  const payfitPos = found.findIndex((f) => f.name === "payfit");
  const rank = payfitPos !== -1 ? payfitPos + 1 : null;

  let snippet = "";
  if (mentioned) {
    const m = text.match(/[^.!?\n]*[Pp]ay[Ff]it[^.!?\n]*/);
    if (m) snippet = m[0].trim().replace(/^\s*[-–•*]\s*/, "");
  }

  return { theme, label, rawText: text, mentioned, rank, snippet, competitors };
}

function buildEngineResult(engine: string, fullResponse: string): EngineResult {
  const sections = parseThemes(fullResponse);
  const themes = sections.map((text, i) => analyzeTheme(text, i));

  const mentioned = themes.filter((t) => t.mentioned);
  const ranks = mentioned.filter((t) => t.rank !== null).map((t) => t.rank!);
  const visibility = Math.round((mentioned.length / themes.length) * 100);
  const avgRank = ranks.length
    ? Math.round((ranks.reduce((a, b) => a + b, 0) / ranks.length) * 10) / 10
    : null;

  return { engine, themes, visibility, avgRank, fullResponse };
}

// ─── Cache (24h — GEO doesn't change hourly) ─────────────────────────────────

let cache: { data: GeoApiResponse; ts: number } | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000;

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";

  if (!force && cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ ...cache.data, cached: true });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!openaiKey || !geminiKey) {
    return NextResponse.json(
      { error: "Clés manquantes : OPENAI_API_KEY et GEMINI_API_KEY requis" },
      { status: 500 }
    );
  }

  const openai = new OpenAI({ apiKey: openaiKey });
  const genai = new GoogleGenerativeAI(geminiKey);
  const geminiModel = genai.getGenerativeModel({ model: "gemini-2.0-flash" });

  // 2 API calls total
  const [gptRes, geminiRes] = await Promise.allSettled([
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu es un expert en logiciels RH et paie en France. Réponds de façon factuelle et concise." },
        { role: "user",   content: BATCH_PROMPT },
      ],
      max_tokens: 450,
      temperature: 0.3,
    }),
    geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: BATCH_PROMPT }] }],
      generationConfig: { maxOutputTokens: 450, temperature: 0.3 },
    }),
  ]);

  const gptText =
    gptRes.status === "fulfilled"
      ? (gptRes.value.choices[0]?.message?.content ?? "")
      : `[Erreur ChatGPT: ${(gptRes as PromiseRejectedResult).reason}]`;

  const geminiText =
    geminiRes.status === "fulfilled"
      ? geminiRes.value.response.text()
      : `[Erreur Gemini: ${(geminiRes as PromiseRejectedResult).reason}]`;

  const engines = [
    buildEngineResult("ChatGPT", gptText),
    buildEngineResult("Gemini",  geminiText),
  ];

  // Global stats
  const allVis = engines.map((e) => e.visibility);
  const globalVisibility = Math.round(allVis.reduce((a, b) => a + b, 0) / allVis.length);

  const allRanks = engines.map((e) => e.avgRank).filter((r): r is number => r !== null);
  const globalAvgRank = allRanks.length
    ? Math.round((allRanks.reduce((a, b) => a + b, 0) / allRanks.length) * 10) / 10
    : null;

  // Top competitors across all engines/themes
  const counts: Record<string, number> = {};
  for (const e of engines) {
    for (const t of e.themes) {
      for (const c of t.competitors) {
        counts[c] = (counts[c] ?? 0) + 1;
      }
    }
  }
  const topCompetitors = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  const data: GeoApiResponse = {
    engines,
    globalVisibility,
    globalAvgRank,
    topCompetitors,
    timestamp: new Date().toISOString(),
    cached: false,
  };

  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}

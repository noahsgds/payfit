import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Themes ───────────────────────────────────────────────────────────────────
// 8 strategic themes for PayFit — still 1 batched call per engine.
// Using a ranked list format (vs paragraph) = ~60% fewer output tokens.

export const THEMES = [
  { id: 1, theme: "logiciel paie PME",      label: "Logiciel de paie PME" },
  { id: 2, theme: "SIRH PME",               label: "SIRH 50-200 salariés" },
  { id: 3, theme: "automatisation paie",    label: "Automatisation paie" },
  { id: 4, theme: "gestion RH PME",         label: "Outils RH PME" },
  { id: 5, theme: "congés absences",        label: "Congés & absences" },
  { id: 6, theme: "notes de frais",         label: "Notes de frais" },
  { id: 7, theme: "onboarding RH",          label: "Onboarding RH digital" },
  { id: 8, theme: "conformité DSN paie",    label: "Conformité DSN/paie" },
];

// Concise list format: each answer is a comma-separated ranked list.
// ~200-300 output tokens total vs ~450 before → cheaper, 2× the themes.
const BATCH_PROMPT = `Tu es un expert en logiciels RH et paie en France.
Pour chaque thème numéroté, cite les 5 meilleures solutions logicielles en ordre décroissant de pertinence, séparées par des virgules.
Format strict (sans markdown, sans explication) :
1. sol1, sol2, sol3, sol4, sol5
2. sol1, sol2, sol3, sol4, sol5
...

Thèmes :
1. Logiciel de paie pour PME
2. SIRH pour entreprise 50-200 salariés
3. Automatisation de la gestion de la paie
4. Outils RH pour PME françaises
5. Gestion des congés et absences
6. Notes de frais en ligne
7. Onboarding RH digital
8. Conformité paie et DSN`;

const KNOWN_SOLUTIONS = [
  "payfit", "silae", "sage", "cegid", "lucca", "factorial",
  "nibelis", "eurecia", "workday", "bamboohr", "kelio", "adp", "combo",
  "spendesk", "rydoo", "n2f", "jenji", "pennylane",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThemeResult {
  theme: string;
  label: string;
  rawText: string;          // the comma-separated list as returned by the AI
  mentioned: boolean;
  rank: number | null;      // position in the list (1 = best)
  competitors: string[];    // other solutions cited
}

export interface EngineResult {
  engine: string;
  themes: ThemeResult[];
  visibility: number;       // % of themes where PayFit appears
  avgRank: number | null;
  fullResponse: string;
}

export interface GeoApiResponse {
  engines: EngineResult[];
  globalVisibility: number;
  globalAvgRank: number | null;
  topCompetitors: { name: string; count: number }[];
  // Matrix: per theme, ranks per engine (null = not cited)
  matrix: { label: string; ranks: (number | null)[] }[];
  engineNames: string[];
  timestamp: string;
  cached: boolean;
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function parseThemes(text: string): string[] {
  const sections: string[] = new Array(THEMES.length).fill("");
  // Strip markdown: bold markers, headers, leading symbols
  const clean = text.replace(/\*\*/g, "").replace(/^#+\s*/gm, "");
  for (const line of clean.split("\n")) {
    // Match "1." "1)" "1:" "1 -" with optional leading whitespace
    const m = line.match(/^\s*(\d+)[.):\-]\s*(.+)/);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < THEMES.length) {
        // Remove any remaining inline markdown (*italic*, etc.)
        sections[idx] = m[2].replace(/[*_`]/g, "").trim();
      }
    }
  }
  return sections;
}

function analyzeTheme(rawText: string, themeId: number): ThemeResult {
  const { theme, label } = THEMES[themeId];
  const lower = rawText.toLowerCase();
  const mentioned = lower.includes("payfit");

  // Parse as ordered list: "PayFit, Silae, Sage, ..."
  const items = rawText.split(",").map((s) => s.trim().toLowerCase());
  const payfitIdx = items.findIndex((s) => s.includes("payfit"));
  const rank = payfitIdx !== -1 ? payfitIdx + 1 : null;

  const competitors = items
    .filter((_, i) => i !== payfitIdx)
    .flatMap((item) => KNOWN_SOLUTIONS.filter((s) => item.includes(s)));

  return { theme, label, rawText, mentioned, rank, competitors };
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

// ─── OpenAI-compatible call ───────────────────────────────────────────────────

const SYSTEM_MSG = "Tu es un expert en logiciels RH et paie en France. Réponds de façon factuelle et concise.";

async function callOpenAICompat(
  client: OpenAI,
  model: string,
  extraHeaders?: Record<string, string>
): Promise<string> {
  const res = await client.chat.completions.create(
    {
      model,
      messages: [
        { role: "system", content: SYSTEM_MSG },
        { role: "user",   content: BATCH_PROMPT },
      ],
      max_tokens: 450,   // 8 lines × ~40 tokens = ~320 min, keep margin
      temperature: 0.2,  // lower = more stable rankings over time
    },
    extraHeaders ? { headers: extraHeaders } : undefined
  );
  return res.choices[0]?.message?.content ?? "";
}

// ─── Cache (24h) ──────────────────────────────────────────────────────────────

let cache: { data: GeoApiResponse; ts: number } | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000;

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";

  if (!force && cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ ...cache.data, cached: true });
  }

  const openaiKey     = process.env.OPENAI_API_KEY;
  const geminiKey     = process.env.GEMINI_API_KEY;
  const groqKey       = process.env.GROQ_API_KEY;
  const mistralKey    = process.env.MISTRAL_API_KEY;
  const openrouterKey = process.env.OPENROUTEUR_API_KEY;

  if (!openaiKey || !geminiKey) {
    return NextResponse.json(
      { error: "Clés manquantes : OPENAI_API_KEY et GEMINI_API_KEY requis" },
      { status: 500 }
    );
  }

  const openai = new OpenAI({ apiKey: openaiKey });
  const genai  = new GoogleGenerativeAI(geminiKey);
  const geminiModel = genai.getGenerativeModel({ model: "gemini-1.5-flash" });

  const groq = groqKey
    ? new OpenAI({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" })
    : null;
  const mistral = mistralKey
    ? new OpenAI({ apiKey: mistralKey, baseURL: "https://api.mistral.ai/v1" })
    : null;
  const openrouter = openrouterKey
    ? new OpenAI({ apiKey: openrouterKey, baseURL: "https://openrouter.ai/api/v1" })
    : null;

  // All 5 in parallel — skip optional ones if key absent
  const [gptRes, geminiRes, groqRes, mistralRes, orRes] = await Promise.allSettled([
    callOpenAICompat(openai, "gpt-4o-mini"),
    geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: BATCH_PROMPT }] }],
      generationConfig: { maxOutputTokens: 450, temperature: 0.2 },
    }),
    groq    ? callOpenAICompat(groq,    "llama-3.3-70b-versatile")               : Promise.reject("no key"),
    mistral ? callOpenAICompat(mistral, "mistral-small-latest")                  : Promise.reject("no key"),
    openrouter
      ? callOpenAICompat(openrouter, "mistralai/mistral-7b-instruct:free", {
          "HTTP-Referer": "https://payfit.com",
          "X-Title": "PayFit GEO Dashboard",
        })
      : Promise.reject("no key"),
  ]);

  const getText = (
    r: PromiseSettledResult<string | { response: { text(): string } }>,
    isGemini = false
  ): string | null => {
    if (r.status === "rejected") {
      return String(r.reason) === "no key" ? null : `[Erreur: ${r.reason}]`;
    }
    if (isGemini) return (r.value as { response: { text(): string } }).response.text();
    return r.value as string;
  };

  const engineDefs: [string, string | null][] = [
    ["ChatGPT",      getText(gptRes)],
    ["Gemini",       getText(geminiRes, true)],
    ["Llama (Groq)", getText(groqRes)],
    ["Mistral",      getText(mistralRes)],
    ["Mistral-7B (OR)", getText(orRes)],
  ];

  const engines = engineDefs
    .filter(([, t]) => t !== null)
    .map(([name, t]) => buildEngineResult(name, t!));

  // Global stats
  const allVis = engines.map((e) => e.visibility);
  const globalVisibility = Math.round(allVis.reduce((a, b) => a + b, 0) / allVis.length);

  const allRanks = engines.map((e) => e.avgRank).filter((r): r is number => r !== null);
  const globalAvgRank = allRanks.length
    ? Math.round((allRanks.reduce((a, b) => a + b, 0) / allRanks.length) * 10) / 10
    : null;

  // Top competitors
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
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Positioning matrix: theme × engine → rank
  const matrix = THEMES.map((th, i) => ({
    label: th.label,
    ranks: engines.map((e) => e.themes[i]?.rank ?? null),
  }));

  const data: GeoApiResponse = {
    engines,
    globalVisibility,
    globalAvgRank,
    topCompetitors,
    matrix,
    engineNames: engines.map((e) => e.engine),
    timestamp: new Date().toISOString(),
    cached: false,
  };

  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}

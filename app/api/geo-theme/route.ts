import { NextResponse } from "next/server";
import OpenAI from "openai";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThemeQueryEngine {
  name:        string;
  items:       string[];              // ordered list returned by the AI
  payfitRank:  number | null;
  competitors: { name: string; rank: number }[];
}

export interface ThemeQueryResult {
  theme:     string;
  engines:   ThemeQueryEngine[];
  timestamp: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const KNOWN_SOLUTIONS = [
  "payfit", "silae", "sage", "cegid", "lucca", "factorial",
  "nibelis", "eurecia", "workday", "bamboohr", "kelio", "adp", "combo",
  "spendesk", "rydoo", "n2f", "jenji", "pennylane",
];

function buildPrompt(theme: string) {
  return `Pour le thème "${theme}" dans le contexte des logiciels RH et paie en France, cite les 5 meilleures solutions logicielles en ordre décroissant de pertinence, séparées par des virgules.
Format strict (une seule ligne, sans markdown, sans explication) :
sol1, sol2, sol3, sol4, sol5`;
}

function parseList(text: string): string[] {
  return text
    .replace(/^\d+[.)]\s*/, "")
    .split(",")
    .map(s => s.trim().replace(/[*_`]/g, ""))
    .filter(Boolean)
    .slice(0, 5);
}

function analyzeList(items: string[]): { payfitRank: number | null; competitors: { name: string; rank: number }[] } {
  const lower = items.map(s => s.toLowerCase());
  const payfitIdx = lower.findIndex(s => s.includes("payfit"));
  const competitors: { name: string; rank: number }[] = [];
  lower.forEach((item, idx) => {
    if (idx === payfitIdx) return;
    KNOWN_SOLUTIONS.forEach(sol => {
      if (item.includes(sol)) competitors.push({ name: sol, rank: idx + 1 });
    });
  });
  return { payfitRank: payfitIdx !== -1 ? payfitIdx + 1 : null, competitors };
}

const SYSTEM_MSG = "Tu es un expert en logiciels RH et paie en France. Réponds de façon factuelle et concise.";

async function callEngine(client: OpenAI, model: string, prompt: string, noSystem = false): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = noSystem
    ? [{ role: "user", content: `${SYSTEM_MSG}\n\n${prompt}` }]
    : [{ role: "system", content: SYSTEM_MSG }, { role: "user", content: prompt }];
  const res = await client.chat.completions.create({ model, messages, max_tokens: 80, temperature: 0.2 });
  return res.choices[0]?.message?.content ?? "";
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const theme = searchParams.get("q")?.trim();

  if (!theme) {
    return NextResponse.json({ error: "Paramètre ?q= requis" }, { status: 400 });
  }

  const openaiKey  = process.env.OPENAI_API_KEY;
  const groqKey    = process.env.GROQ_API_KEY;
  const mistralKey = process.env.MISTRAL_API_KEY;

  if (!openaiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY manquant" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: openaiKey });
  const groq   = groqKey   ? new OpenAI({ apiKey: groqKey,   baseURL: "https://api.groq.com/openai/v1"  }) : null;
  const mistral= mistralKey? new OpenAI({ apiKey: mistralKey, baseURL: "https://api.mistral.ai/v1"       }) : null;

  const prompt = buildPrompt(theme);

  const [gptRes, groqRes, mistralRes] = await Promise.allSettled([
    callEngine(openai, "gpt-4o-mini", prompt),
    groq    ? callEngine(groq,    "llama-3.3-70b-versatile", prompt) : Promise.reject("no key"),
    mistral ? callEngine(mistral, "mistral-small-latest",    prompt) : Promise.reject("no key"),
  ]);

  const ENGINES = [
    { name: "ChatGPT",      res: gptRes },
    { name: "Llama (Groq)", res: groqRes },
    { name: "Mistral",      res: mistralRes },
  ];

  const engines: ThemeQueryEngine[] = ENGINES.flatMap(({ name, res }) => {
    if (res.status === "rejected") return [];
    const items = parseList(res.value);
    const { payfitRank, competitors } = analyzeList(items);
    return [{ name, items, payfitRank, competitors }];
  });

  const result: ThemeQueryResult = { theme, engines, timestamp: new Date().toISOString() };
  return NextResponse.json(result);
}

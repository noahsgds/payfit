import { NextResponse } from "next/server";
import OpenAI from "openai";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RedditPost {
  id:          string;
  title:       string;
  content:     string;
  subreddit:   string;
  author:      string;
  score:       number;
  numComments: number;
  permalink:   string;
  createdAt:   string;   // ISO
  sentiment:   "positive" | "neutral" | "negative";
}

export interface SocialRedditResponse {
  posts:           RedditPost[];
  sentimentPct:    { positive: number; neutral: number; negative: number };
  topSubreddits:   { name: string; count: number }[];
  dailyCounts:     { date: string; count: number }[];
  totalMentions:   number;
  timestamp:       string;
  cached:          boolean;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

let cache: { data: SocialRedditResponse; expiresAt: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 min

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface RawRedditChild {
  id: string; title: string; selftext: string; subreddit: string;
  author: string; score: number; num_comments: number;
  permalink: string; created_utc: number;
}

async function fetchRedditPosts(): Promise<RawRedditChild[]> {
  const res = await fetch(
    "https://www.reddit.com/search.json?q=payfit&sort=new&limit=25&type=link",
    { headers: { "User-Agent": "PayFit-Dashboard/1.0 (internal monitoring)" } },
  );
  if (!res.ok) throw new Error(`Reddit ${res.status}`);
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.data?.children ?? []).map((c: any) => c.data as RawRedditChild);
}

async function classifySentiments(
  posts: RawRedditChild[],
  openai: OpenAI,
): Promise<Array<"positive" | "neutral" | "negative">> {
  if (posts.length === 0) return [];

  const texts = posts
    .map((p, i) => `${i}: "${p.title}. ${p.selftext.slice(0, 120)}"`)
    .join("\n");

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Tu es un expert en analyse de sentiment. Réponds uniquement en JSON." },
      {
        role: "user",
        content:
          `Classe le sentiment de ces posts Reddit à propos de PayFit (logiciel RH français) en "positive", "neutral" ou "negative".\n\n${texts}\n\nRéponds par un JSON array de la même longueur : ["positive","neutral",...]`,
      },
    ],
    max_tokens: 200,
    temperature: 0,
  });

  const content = res.choices[0]?.message?.content ?? "[]";
  try {
    const arr = JSON.parse(content.match(/\[[\s\S]*?\]/)?.[0] ?? "[]");
    const valid = ["positive", "neutral", "negative"];
    return arr.map((s: string) => (valid.includes(s) ? s : "neutral")) as Array<
      "positive" | "neutral" | "negative"
    >;
  } catch {
    return posts.map(() => "neutral");
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json({ ...cache.data, cached: true });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY manquant" }, { status: 500 });
  }

  try {
    const openai   = new OpenAI({ apiKey: openaiKey });
    const rawPosts = await fetchRedditPosts();
    const sentiments = await classifySentiments(rawPosts, openai);

    const posts: RedditPost[] = rawPosts.map((p, i) => ({
      id:          p.id,
      title:       p.title,
      content:     p.selftext || p.title,
      subreddit:   `r/${p.subreddit}`,
      author:      `u/${p.author}`,
      score:       p.score,
      numComments: p.num_comments,
      permalink:   `https://reddit.com${p.permalink}`,
      createdAt:   new Date(p.created_utc * 1000).toISOString(),
      sentiment:   sentiments[i] ?? "neutral",
    }));

    // Sentiment %
    const counts = { positive: 0, neutral: 0, negative: 0 };
    posts.forEach(p => counts[p.sentiment]++);
    const total = posts.length || 1;
    const sentimentPct = {
      positive: Math.round((counts.positive / total) * 100),
      neutral:  Math.round((counts.neutral  / total) * 100),
      negative: Math.round((counts.negative / total) * 100),
    };

    // Top subreddits
    const subMap = new Map<string, number>();
    posts.forEach(p => subMap.set(p.subreddit, (subMap.get(p.subreddit) ?? 0) + 1));
    const topSubreddits = Array.from(subMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Daily counts — last 7 days
    const now = Date.now();
    const dailyCounts = Array.from({ length: 7 }, (_, i) => {
      const day   = new Date(now - (6 - i) * 86_400_000);
      const ymd   = day.toISOString().slice(0, 10);
      const label = day.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      const count = posts.filter(p => p.createdAt.slice(0, 10) === ymd).length;
      return { date: label, count };
    });

    const response: SocialRedditResponse = {
      posts,
      sentimentPct,
      topSubreddits,
      dailyCounts,
      totalMentions: posts.length,
      timestamp:     new Date().toISOString(),
      cached:        false,
    };

    cache = { data: response, expiresAt: Date.now() + CACHE_TTL };
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur inconnue" },
      { status: 500 },
    );
  }
}

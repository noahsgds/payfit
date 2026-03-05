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
  posts:         RedditPost[];
  sentimentPct:  { positive: number; neutral: number; negative: number };
  topSubreddits: { name: string; count: number }[];
  dailyCounts:   { date: string; count: number }[];
  totalMentions: number;
  timestamp:     string;
  cached:        boolean;
  source:        "live" | "mock";
}

// ─── Cache ────────────────────────────────────────────────────────────────────

let cache: { data: SocialRedditResponse; expiresAt: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

// ─── Mock data (fallback quand Reddit est inaccessible) ───────────────────────

function buildMockResponse(): SocialRedditResponse {
  const now = Date.now();

  // Posts répartis sur les 7 derniers jours
  const rawMock: Array<Omit<RedditPost, "createdAt"> & { daysAgo: number }> = [
    {
      id: "m1", daysAgo: 0,
      title: "Franchement PayFit c'est top pour notre PME de 45 salariés — l'automatisation des bulletins nous a sauvé la vie !",
      content: "Franchement PayFit c'est top pour notre PME de 45 salariés. L'automatisation des bulletins nous a sauvé la vie, et la conformité légale est toujours à jour.",
      subreddit: "r/paie", author: "u/compta_martin",
      score: 47, numComments: 12,
      permalink: "https://reddit.com/r/paie/comments/m1", sentiment: "positive",
    },
    {
      id: "m2", daysAgo: 0,
      title: "PayFit ou Silae pour une startup de 20 personnes ? Le pricing me paraît élevé",
      content: "On hésite entre PayFit et Silae. PayFit semble plus moderne mais le tarif par salarié devient vite cher quand on scale.",
      subreddit: "r/entrepreneur", author: "u/startup_ceo",
      score: 12, numComments: 28,
      permalink: "https://reddit.com/r/entrepreneur/comments/m2", sentiment: "neutral",
    },
    {
      id: "m3", daysAgo: 1,
      title: "Le support client de PayFit a mis 3 jours à répondre à notre ticket urgent — décevant",
      content: "On avait un problème de DSN bloquant et le support a pris 3 jours ouvrés. Pour un outil premium c'est trop long.",
      subreddit: "r/RH", author: "u/ConseilRH",
      score: 34, numComments: 67,
      permalink: "https://reddit.com/r/RH/comments/m3", sentiment: "negative",
    },
    {
      id: "m4", daysAgo: 1,
      title: "Migration vers PayFit terminée — retour d'expérience après 6 mois",
      content: "L'import des données était complexe au début mais l'équipe onboarding a été très réactive. Maintenant on est satisfaits.",
      subreddit: "r/paie", author: "u/daf_fintech",
      score: 89, numComments: 34,
      permalink: "https://reddit.com/r/paie/comments/m4", sentiment: "positive",
    },
    {
      id: "m5", daysAgo: 2,
      title: "Comparatif SIRH 2025 : PayFit arrive en tête sur la facilité d'utilisation",
      content: "J'ai fait un tour d'horizon des solutions SIRH pour PME. PayFit se distingue sur l'UX et la conformité, même si Lucca progresse.",
      subreddit: "r/RH", author: "u/RHDigitalFrance",
      score: 156, numComments: 43,
      permalink: "https://reddit.com/r/RH/comments/m5", sentiment: "positive",
    },
    {
      id: "m6", daysAgo: 2,
      title: "Avis sur PayFit après 3 ans d'utilisation — on a réduit 60% du temps consacré à la paie",
      content: "Honnêtement transformateur pour nos équipes RH. La gestion des congés en self-service a aussi soulagé les managers.",
      subreddit: "r/gestionPME", author: "u/marie_drh",
      score: 234, numComments: 45,
      permalink: "https://reddit.com/r/gestionPME/comments/m6", sentiment: "positive",
    },
    {
      id: "m7", daysAgo: 3,
      title: "Bug de calcul des heures supplémentaires sur PayFit — quelqu'un d'autre touché ?",
      content: "Depuis la dernière mise à jour, les heures sup ne sont plus calculées correctement. J'ai ouvert un ticket il y a 2 jours.",
      subreddit: "r/paie", author: "u/comptable_web",
      score: 28, numComments: 19,
      permalink: "https://reddit.com/r/paie/comments/m7", sentiment: "negative",
    },
    {
      id: "m8", daysAgo: 3,
      title: "PayFit annonce une intégration native avec Pennylane — enfin !",
      content: "Bonne nouvelle pour ceux qui utilisent les deux outils. L'intégration comptable devrait éviter pas mal de ressaisies.",
      subreddit: "r/comptabilite", author: "u/expert_compta",
      score: 67, numComments: 11,
      permalink: "https://reddit.com/r/comptabilite/comments/m8", sentiment: "positive",
    },
    {
      id: "m9", daysAgo: 4,
      title: "Question : PayFit gère-t-il bien les salariés en portage salarial ?",
      content: "On a quelques freelances en portage, je me demande si PayFit s'en sort ou si on doit gérer ça manuellement.",
      subreddit: "r/freelance", author: "u/indie_rh",
      score: 9, numComments: 7,
      permalink: "https://reddit.com/r/freelance/comments/m9", sentiment: "neutral",
    },
    {
      id: "m10", daysAgo: 4,
      title: "PayFit vs ADP pour 200 salariés — retour terrain après appels d'offres",
      content: "On a comparé les deux. PayFit gagne sur la modernité et le prix, ADP sur les fonctionnalités avancées de reporting.",
      subreddit: "r/RH", author: "u/drh_industrie",
      score: 43, numComments: 22,
      permalink: "https://reddit.com/r/RH/comments/m10", sentiment: "neutral",
    },
    {
      id: "m11", daysAgo: 5,
      title: "Excellent retour sur la gestion des congés PayFit — nos salariés adorent l'app mobile",
      content: "L'app mobile pour poser des congés a vraiment changé la donne. Moins de mails, tout est traçable.",
      subreddit: "r/gestionPME", author: "u/office_manager_75",
      score: 78, numComments: 14,
      permalink: "https://reddit.com/r/gestionPME/comments/m11", sentiment: "positive",
    },
    {
      id: "m12", daysAgo: 6,
      title: "Problème d'export des bulletins en PDF depuis 2 semaines sur PayFit",
      content: "Les PDF générés sont corrompus sur certains navigateurs. Le support dit que c'est en cours de correction.",
      subreddit: "r/paie", author: "u/grh_bx",
      score: 15, numComments: 8,
      permalink: "https://reddit.com/r/paie/comments/m12", sentiment: "negative",
    },
  ];

  const posts: RedditPost[] = rawMock.map(({ daysAgo, ...p }) => ({
    ...p,
    createdAt: new Date(now - daysAgo * 86_400_000 - Math.random() * 3_600_000 * 8).toISOString(),
  }));

  // Sentiment %
  const counts = { positive: 0, neutral: 0, negative: 0 };
  posts.forEach(p => counts[p.sentiment]++);
  const total = posts.length;
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
    .sort((a, b) => b.count - a.count);

  // Daily counts
  const dailyCounts = Array.from({ length: 7 }, (_, i) => {
    const day   = new Date(now - (6 - i) * 86_400_000);
    const ymd   = day.toISOString().slice(0, 10);
    const label = day.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    const count = posts.filter(p => p.createdAt.slice(0, 10) === ymd).length;
    return { date: label, count };
  });

  return {
    posts,
    sentimentPct,
    topSubreddits,
    dailyCounts,
    totalMentions: posts.length,
    timestamp: new Date().toISOString(),
    cached: false,
    source: "mock",
  };
}

// ─── Helpers live ─────────────────────────────────────────────────────────────

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
        content: `Classe le sentiment de ces posts Reddit à propos de PayFit (logiciel RH français) en "positive", "neutral" ou "negative".\n\n${texts}\n\nRéponds par un JSON array de la même longueur : ["positive","neutral",...]`,
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

  try {
    // Tente le fetch Reddit live
    const rawPosts = await fetchRedditPosts();

    const sentiments = openaiKey
      ? await classifySentiments(rawPosts, new OpenAI({ apiKey: openaiKey }))
      : rawPosts.map(() => "neutral" as const);

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

    const counts = { positive: 0, neutral: 0, negative: 0 };
    posts.forEach(p => counts[p.sentiment]++);
    const total = posts.length || 1;
    const sentimentPct = {
      positive: Math.round((counts.positive / total) * 100),
      neutral:  Math.round((counts.neutral  / total) * 100),
      negative: Math.round((counts.negative / total) * 100),
    };

    const subMap = new Map<string, number>();
    posts.forEach(p => subMap.set(p.subreddit, (subMap.get(p.subreddit) ?? 0) + 1));
    const topSubreddits = Array.from(subMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const now = Date.now();
    const dailyCounts = Array.from({ length: 7 }, (_, i) => {
      const day   = new Date(now - (6 - i) * 86_400_000);
      const ymd   = day.toISOString().slice(0, 10);
      const label = day.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      const count = posts.filter(p => p.createdAt.slice(0, 10) === ymd).length;
      return { date: label, count };
    });

    const response: SocialRedditResponse = {
      posts, sentimentPct, topSubreddits, dailyCounts,
      totalMentions: posts.length,
      timestamp: new Date().toISOString(),
      cached: false, source: "live",
    };
    cache = { data: response, expiresAt: Date.now() + CACHE_TTL };
    return NextResponse.json(response);

  } catch {
    // Reddit inaccessible → fallback mock
    const mock = buildMockResponse();
    cache = { data: mock, expiresAt: Date.now() + CACHE_TTL };
    return NextResponse.json(mock);
  }
}

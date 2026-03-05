import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ApifyClient } from "apify-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Platform = "reddit" | "twitter" | "linkedin";
export type Sentiment = "positive" | "neutral" | "negative";

export interface SocialPost {
  id:          string;
  platform:    Platform;
  title?:      string;       // Reddit only
  content:     string;
  author:      string;
  source:      string;       // subreddit / @handle / Job title
  score:       number;       // upvotes / likes / réactions
  numComments: number;
  permalink?:  string;
  createdAt:   string;       // ISO
  sentiment:   Sentiment;
}

export interface PlatformStats {
  count:        number;
  sentimentPct: { positive: number; neutral: number; negative: number };
  topSources:   { name: string; count: number }[];
}

export interface SocialDataResponse {
  posts:         SocialPost[];
  byPlatform:    Record<Platform, PlatformStats>;
  sentimentPct:  { positive: number; neutral: number; negative: number };
  dailyCounts:   { date: string; reddit: number; twitter: number; linkedin: number }[];
  totalMentions: number;
  timestamp:      string;
  cached:         boolean;
  platformSource: Record<Platform, "live" | "mock">;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

let cache: { data: SocialDataResponse; expiresAt: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

// ─── Mock data ────────────────────────────────────────────────────────────────

const TWITTER_MOCK: Array<Omit<SocialPost, "id" | "createdAt" | "platform"> & { daysAgo: number }> = [
  {
    daysAgo: 0,
    content: "Après 2 ans sur @PayFit, notre équipe RH a gagné 8h/semaine. L'automatisation DSN + DPAE est bluffante 🎯 #SIRH #Paie #RH",
    author: "@RHdigitalFr",
    source: "@RHdigitalFr",
    score: 142, numComments: 31, sentiment: "positive",
  },
  {
    daysAgo: 0,
    content: "Comparatif #SIRH PME 2025 : #PayFit 1er sur l'UX, Lucca 2e sur les intégrations, Silae 3e sur la puissance paie. Notre analyse complète ↓",
    author: "@HRTechInsider",
    source: "@HRTechInsider",
    score: 89, numComments: 44, sentiment: "positive",
  },
  {
    daysAgo: 1,
    content: "3ème ticket ouvert chez @PayFit pour le même bug de calcul des CP. Toujours pas résolu après 10 jours. 😤 #SupportClient",
    author: "@paieduquotidien",
    source: "@paieduquotidien",
    score: 67, numComments: 23, sentiment: "negative",
  },
  {
    daysAgo: 2,
    content: "Nouveau : @PayFit lance son intégration native avec @pennylane_fr. Fini la ressaisie comptable ! 🙌 #FinTech #Paie",
    author: "@ComptaConnect",
    source: "@ComptaConnect",
    score: 204, numComments: 56, sentiment: "positive",
  },
  {
    daysAgo: 3,
    content: "Question : @PayFit gère-t-il les salariés multi-employeurs ? On a des cas atypiques dans notre boîte #RH #Paie",
    author: "@drh_startup",
    source: "@drh_startup",
    score: 18, numComments: 9, sentiment: "neutral",
  },
  {
    daysAgo: 4,
    content: "La démo @PayFit était top, mais le pricing à la taille d'équipe devient vite cher quand on scale 📈 On reste sur Silae finalement",
    author: "@cfo_scale",
    source: "@cfo_scale",
    score: 34, numComments: 17, sentiment: "neutral",
  },
  {
    daysAgo: 5,
    content: "Nos salariés adorent l'app @PayFit pour poser leurs congés. 0 mail RH depuis 3 mois ✅ #ExperienceEmploye",
    author: "@OfficeManager75",
    source: "@OfficeManager75",
    score: 178, numComments: 28, sentiment: "positive",
  },
  {
    daysAgo: 6,
    content: "PayFit vs ADP pour 200 personnes — PayFit gagne sur la modernité, ADP sur le reporting avancé. Thread complet 🧵 #SIRH",
    author: "@consultantRH",
    source: "@consultantRH",
    score: 93, numComments: 41, sentiment: "neutral",
  },
];

const LINKEDIN_MOCK: Array<Omit<SocialPost, "id" | "createdAt" | "platform"> & { daysAgo: number }> = [
  {
    daysAgo: 0,
    content: "3 ans sur PayFit et je ne reviendrai jamais en arrière. Nos bulletins de paie sont traités en 2h là où nous passions 2 jours. La conformité légale est toujours à jour automatiquement — un vrai avantage pour nos équipes RH.",
    author: "Marie Dupont",
    source: "DRH · Groupe Horizon (180 sal.)",
    score: 312, numComments: 47, sentiment: "positive",
  },
  {
    daysAgo: 1,
    content: "Nous venons de terminer notre migration vers PayFit après 6 mois de projet. L'import des données était plus complexe que prévu, mais l'équipe CSM a été exemplaire. Résultat : -60% de temps consacré à la paie. Je recommande.",
    author: "Thomas Leroy",
    source: "CFO · MedTech Partners",
    score: 245, numComments: 38, sentiment: "positive",
  },
  {
    daysAgo: 1,
    content: "Honnêtement déçu par le support PayFit. Nous avons un problème de DSN bloquant depuis 5 jours et les réponses sont génériques. Pour un outil à ce prix, on s'attend à mieux. Des retours similaires dans votre réseau ?",
    author: "Sophie Martin",
    source: "Responsable Paie · RetailGroup",
    score: 89, numComments: 134, sentiment: "negative",
  },
  {
    daysAgo: 2,
    content: "Benchmark SIRH terminé pour notre groupe de 450 salariés. PayFit arrive 2e derrière Workday sur les fonctionnalités avancées, mais 1er sur la facilité d'adoption et le rapport qualité/prix. Notre choix final : PayFit.",
    author: "Antoine Rousseau",
    source: "CHRO · IndustriesFrance",
    score: 456, numComments: 67, sentiment: "positive",
  },
  {
    daysAgo: 3,
    content: "Retour sur notre POC PayFit (3 mois) : points forts = UX, mobilité, automatisations. Points à améliorer = reporting personnalisé limité, intégrations ERP complexes. Au global positif pour une PME < 200 sal.",
    author: "Julie Fontaine",
    source: "HR Tech Lead · Startup Nation",
    score: 167, numComments: 29, sentiment: "neutral",
  },
  {
    daysAgo: 4,
    content: "Ce que PayFit a changé pour nous : nos managers posent les congés eux-mêmes, les notes de frais sont remboursées en 48h, et nos RH font de la vraie stratégie plutôt que de la saisie. C'est ça la vraie valeur d'un bon SIRH.",
    author: "Camille Blanc",
    source: "DG · AgenceDigitale42",
    score: 523, numComments: 83, sentiment: "positive",
  },
  {
    daysAgo: 6,
    content: "PayFit annonce de nouvelles fonctionnalités de reporting RH pour Q2 2025. Vivement ! C'était le point faible de la solution. Les indicateurs de turnover et d'absentéisme en natif, c'est ce qu'on attendait.",
    author: "Pierre Dubois",
    source: "Head of HR · ScaleFast",
    score: 198, numComments: 42, sentiment: "positive",
  },
];

const REDDIT_MOCK_POSTS: Array<Omit<SocialPost, "id" | "createdAt" | "platform"> & { daysAgo: number }> = [
  {
    daysAgo: 0,
    title: "Franchement PayFit c'est top pour notre PME de 45 salariés — l'automatisation des bulletins nous a sauvé la vie !",
    content: "Franchement PayFit c'est top. L'automatisation des bulletins nous a sauvé la vie, et la conformité légale est toujours à jour.",
    author: "u/compta_martin", source: "r/paie", score: 47, numComments: 12, sentiment: "positive",
    permalink: "https://reddit.com/r/paie/comments/mock1",
  },
  {
    daysAgo: 0,
    title: "PayFit ou Silae pour une startup de 20 personnes ? Le pricing me paraît élevé",
    content: "On hésite entre PayFit et Silae. PayFit semble plus moderne mais le tarif par salarié devient vite cher quand on scale.",
    author: "u/startup_ceo", source: "r/entrepreneur", score: 12, numComments: 28, sentiment: "neutral",
    permalink: "https://reddit.com/r/entrepreneur/comments/mock2",
  },
  {
    daysAgo: 1,
    title: "Le support client de PayFit a mis 3 jours à répondre à notre ticket urgent — décevant",
    content: "On avait un problème de DSN bloquant et le support a pris 3 jours ouvrés. Pour un outil premium c'est trop long.",
    author: "u/ConseilRH", source: "r/RH", score: 34, numComments: 67, sentiment: "negative",
    permalink: "https://reddit.com/r/RH/comments/mock3",
  },
  {
    daysAgo: 1,
    title: "Migration vers PayFit terminée — retour d'expérience après 6 mois",
    content: "L'import des données était complexe au début mais l'équipe onboarding a été très réactive. Maintenant on est satisfaits.",
    author: "u/daf_fintech", source: "r/paie", score: 89, numComments: 34, sentiment: "positive",
    permalink: "https://reddit.com/r/paie/comments/mock4",
  },
  {
    daysAgo: 2,
    title: "Comparatif SIRH 2025 : PayFit arrive en tête sur la facilité d'utilisation",
    content: "J'ai fait un tour d'horizon des solutions SIRH pour PME. PayFit se distingue sur l'UX et la conformité.",
    author: "u/RHDigitalFrance", source: "r/RH", score: 156, numComments: 43, sentiment: "positive",
    permalink: "https://reddit.com/r/RH/comments/mock5",
  },
  {
    daysAgo: 2,
    title: "Avis sur PayFit après 3 ans — on a réduit 60% du temps consacré à la paie",
    content: "Honnêtement transformateur pour nos équipes RH. La gestion des congés en self-service a aussi soulagé les managers.",
    author: "u/marie_drh", source: "r/gestionPME", score: 234, numComments: 45, sentiment: "positive",
    permalink: "https://reddit.com/r/gestionPME/comments/mock6",
  },
  {
    daysAgo: 3,
    title: "Bug de calcul des heures supplémentaires sur PayFit — quelqu'un d'autre touché ?",
    content: "Depuis la dernière mise à jour, les heures sup ne sont plus calculées correctement.",
    author: "u/comptable_web", source: "r/paie", score: 28, numComments: 19, sentiment: "negative",
    permalink: "https://reddit.com/r/paie/comments/mock7",
  },
  {
    daysAgo: 4,
    title: "PayFit annonce une intégration native avec Pennylane — enfin !",
    content: "Bonne nouvelle pour ceux qui utilisent les deux outils. L'intégration comptable devrait éviter pas mal de ressaisies.",
    author: "u/expert_compta", source: "r/comptabilite", score: 67, numComments: 11, sentiment: "positive",
    permalink: "https://reddit.com/r/comptabilite/comments/mock8",
  },
  {
    daysAgo: 4,
    title: "Question : PayFit gère-t-il bien les salariés en portage salarial ?",
    content: "On a quelques freelances en portage, je me demande si PayFit s'en sort ou si on doit gérer ça manuellement.",
    author: "u/indie_rh", source: "r/freelance", score: 9, numComments: 7, sentiment: "neutral",
    permalink: "https://reddit.com/r/freelance/comments/mock9",
  },
  {
    daysAgo: 5,
    title: "Excellent retour sur la gestion des congés PayFit — nos salariés adorent l'app mobile",
    content: "L'app mobile pour poser des congés a vraiment changé la donne. Moins de mails, tout est traçable.",
    author: "u/office_manager_75", source: "r/gestionPME", score: 78, numComments: 14, sentiment: "positive",
    permalink: "https://reddit.com/r/gestionPME/comments/mock10",
  },
  {
    daysAgo: 6,
    title: "Problème d'export des bulletins en PDF depuis 2 semaines sur PayFit",
    content: "Les PDF générés sont corrompus sur certains navigateurs. Le support dit que c'est en cours de correction.",
    author: "u/grh_bx", source: "r/paie", score: 15, numComments: 8, sentiment: "negative",
    permalink: "https://reddit.com/r/paie/comments/mock11",
  },
];

type MockEntry = Omit<SocialPost, "id" | "createdAt" | "platform"> & { daysAgo: number };

function buildPosts(rawMock: MockEntry[], platform: Platform): SocialPost[] {
  const now = Date.now();
  return rawMock.map((p, i) => {
    const { daysAgo, ...rest } = p;
    return {
      ...rest,
      id: `${platform}-${i}`,
      platform,
      createdAt: new Date(now - daysAgo * 86_400_000 - Math.floor(Math.random() * 8 * 3_600_000)).toISOString(),
    };
  });
}

function computePlatformStats(posts: SocialPost[]): PlatformStats {
  const total = posts.length || 1;
  const counts = { positive: 0, neutral: 0, negative: 0 };
  const sourceMap = new Map<string, number>();
  posts.forEach(p => {
    counts[p.sentiment]++;
    sourceMap.set(p.source, (sourceMap.get(p.source) ?? 0) + 1);
  });
  return {
    count: posts.length,
    sentimentPct: {
      positive: Math.round((counts.positive / total) * 100),
      neutral:  Math.round((counts.neutral  / total) * 100),
      negative: Math.round((counts.negative / total) * 100),
    },
    topSources: Array.from(sourceMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

function buildResponse(
  redditPosts:    SocialPost[],
  twitterPosts:   SocialPost[],
  linkedinPosts:  SocialPost[],
  platformSource: Record<Platform, "live" | "mock">,
): SocialDataResponse {
  const now = Date.now();

  const allPosts = [...redditPosts, ...twitterPosts, ...linkedinPosts]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = allPosts.length || 1;
  const gCounts = { positive: 0, neutral: 0, negative: 0 };
  allPosts.forEach(p => gCounts[p.sentiment]++);
  const sentimentPct = {
    positive: Math.round((gCounts.positive / total) * 100),
    neutral:  Math.round((gCounts.neutral  / total) * 100),
    negative: Math.round((gCounts.negative / total) * 100),
  };

  const dailyCounts = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now - (6 - i) * 86_400_000);
    const ymd = day.toISOString().slice(0, 10);
    const label = day.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    return {
      date:     label,
      reddit:   redditPosts .filter(p => p.createdAt.slice(0, 10) === ymd).length,
      twitter:  twitterPosts .filter(p => p.createdAt.slice(0, 10) === ymd).length,
      linkedin: linkedinPosts.filter(p => p.createdAt.slice(0, 10) === ymd).length,
    };
  });

  return {
    posts:         allPosts,
    byPlatform:    {
      reddit:   computePlatformStats(redditPosts),
      twitter:  computePlatformStats(twitterPosts),
      linkedin: computePlatformStats(linkedinPosts),
    },
    sentimentPct,
    dailyCounts,
    totalMentions:  allPosts.length,
    timestamp:      new Date().toISOString(),
    cached:         false,
    platformSource,
  };
}

// ─── Reddit live helpers ──────────────────────────────────────────────────────

interface RawChild {
  id: string; title: string; selftext: string; subreddit: string;
  author: string; score: number; num_comments: number;
  permalink: string; created_utc: number;
}

async function fetchRedditLive(): Promise<SocialPost[]> {
  const res = await fetch(
    "https://www.reddit.com/search.json?q=payfit&sort=new&limit=25&type=link",
    { headers: { "User-Agent": "PayFit-Dashboard/1.0" } },
  );
  if (!res.ok) throw new Error(`Reddit ${res.status}`);
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: RawChild[] = (json.data?.children ?? []).map((c: any) => c.data);
  return children.map(p => ({
    id:          `reddit-${p.id}`,
    platform:    "reddit" as const,
    title:       p.title,
    content:     p.selftext || p.title,
    author:      `u/${p.author}`,
    source:      `r/${p.subreddit}`,
    score:       p.score,
    numComments: p.num_comments,
    permalink:   `https://reddit.com${p.permalink}`,
    createdAt:   new Date(p.created_utc * 1000).toISOString(),
    sentiment:   "neutral" as const, // scored below if OpenAI available
  }));
}

async function scoreSentiment(posts: SocialPost[], openai: OpenAI): Promise<SocialPost[]> {
  if (posts.length === 0) return posts;
  const texts = posts.map((p, i) => `${i}: "${p.title ?? ""} ${p.content.slice(0, 120)}"`).join("\n");
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Expert en analyse de sentiment. JSON uniquement." },
      { role: "user", content: `Sentiment de ces posts (PayFit, logiciel RH) : "positive", "neutral" ou "negative".\n${texts}\nRéponds: ["positive",...]` },
    ],
    max_tokens: 200, temperature: 0,
  });
  const content = res.choices[0]?.message?.content ?? "[]";
  try {
    const arr = JSON.parse(content.match(/\[[\s\S]*?\]/)?.[0] ?? "[]");
    const valid = ["positive", "neutral", "negative"];
    return posts.map((p, i) => ({
      ...p,
      sentiment: (valid.includes(arr[i]) ? arr[i] : "neutral") as Sentiment,
    }));
  } catch {
    return posts;
  }
}

// ─── Apify fetchers ───────────────────────────────────────────────────────────

async function fetchTwitterApify(client: ApifyClient): Promise<SocialPost[]> {
  const run = await client.actor("apidojo/tweet-scraper").call({
    searchTerms: ["payfit"],
    maxItems: 20,
    sort: "Latest",
    twitterHandles: [],
  }, { waitSecs: 60 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { items } = await client.dataset(run.defaultDatasetId).listItems() as { items: any[] };

  return items
    .filter(t => t.text)
    .map((t, i) => ({
      id:          `twitter-live-${i}`,
      platform:    "twitter" as const,
      content:     t.text ?? "",
      author:      t.author?.userName ? `@${t.author.userName}` : t.author?.name ?? "unknown",
      source:      t.author?.userName ? `@${t.author.userName}` : t.author?.name ?? "unknown",
      score:       t.likeCount   ?? 0,
      numComments: t.replyCount  ?? 0,
      permalink:   t.url,
      createdAt:   t.createdAt ?? new Date().toISOString(),
      sentiment:   "neutral" as const,
    }));
}

async function fetchLinkedinApify(client: ApifyClient): Promise<SocialPost[]> {
  const run = await client.actor("curious_coder/linkedin-post-search-scraper").call({
    queries:    ["payfit"],
    maxResults: 20,
  }, { waitSecs: 90 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { items } = await client.dataset(run.defaultDatasetId).listItems() as { items: any[] };

  return items
    .filter(p => p.text || p.content)
    .map((p, i) => ({
      id:          `linkedin-live-${i}`,
      platform:    "linkedin" as const,
      content:     p.text ?? p.content ?? "",
      author:      p.authorName ?? p.author?.name ?? "Auteur LinkedIn",
      source:      p.authorTitle ? `${p.authorTitle}` : (p.authorCompany ?? "LinkedIn"),
      score:       p.likeCount      ?? p.reactionsCount ?? 0,
      numComments: p.commentsCount  ?? 0,
      permalink:   p.url ?? p.postUrl,
      createdAt:   p.postedAt ?? p.publishedAt ?? new Date().toISOString(),
      sentiment:   "neutral" as const,
    }));
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json({ ...cache.data, cached: true });
  }

  const openaiKey  = process.env.OPENAI_API_KEY;
  const apifyToken = process.env.APIFY_TOKEN;

  const apify = apifyToken ? new ApifyClient({ token: apifyToken }) : null;

  // ── Reddit ──
  let redditPosts: SocialPost[];
  let redditSource: "live" | "mock";
  try {
    redditPosts  = await fetchRedditLive();
    redditSource = "live";
  } catch {
    redditPosts  = buildPosts(REDDIT_MOCK_POSTS, "reddit");
    redditSource = "mock";
  }

  // ── Twitter ──
  let twitterPosts: SocialPost[];
  let twitterSource: "live" | "mock";
  try {
    if (!apify) throw new Error("no Apify token");
    twitterPosts  = await fetchTwitterApify(apify);
    twitterSource = "live";
  } catch {
    twitterPosts  = buildPosts(TWITTER_MOCK, "twitter");
    twitterSource = "mock";
  }

  // ── LinkedIn ──
  let linkedinPosts: SocialPost[];
  let linkedinSource: "live" | "mock";
  try {
    if (!apify) throw new Error("no Apify token");
    linkedinPosts  = await fetchLinkedinApify(apify);
    linkedinSource = "live";
  } catch {
    linkedinPosts  = buildPosts(LINKEDIN_MOCK, "linkedin");
    linkedinSource = "mock";
  }

  // ── Sentiment scoring (OpenAI) ──
  if (openaiKey) {
    const openai = new OpenAI({ apiKey: openaiKey });
    const allLive = [
      ...(redditSource  === "live" ? redditPosts  : []),
      ...(twitterSource === "live" ? twitterPosts  : []),
      ...(linkedinSource === "live" ? linkedinPosts : []),
    ];
    const scored = allLive.length > 0 ? await scoreSentiment(allLive, openai) : [];
    const scoredMap = new Map(scored.map(p => [p.id, p]));
    redditPosts  = redditPosts .map(p => scoredMap.get(p.id) ?? p);
    twitterPosts  = twitterPosts .map(p => scoredMap.get(p.id) ?? p);
    linkedinPosts = linkedinPosts.map(p => scoredMap.get(p.id) ?? p);
  }

  const platformSource: Record<Platform, "live" | "mock"> = {
    reddit:   redditSource,
    twitter:  twitterSource,
    linkedin: linkedinSource,
  };

  const response = buildResponse(redditPosts, twitterPosts, linkedinPosts, platformSource);
  cache = { data: response, expiresAt: Date.now() + CACHE_TTL };
  return NextResponse.json(response);
}

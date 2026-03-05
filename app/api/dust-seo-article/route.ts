import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { triggerDustAgent } from "../../lib/dust";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    mode = "guided",
    keyword,
    themes,
    topic,
    tone = "professionnel",
    wordCount = 1000,
  } = body as {
    mode?: "guided" | "auto";
    keyword?: string;
    themes?: string;
    topic?: string;
    tone?: string;
    wordCount?: number;
  };

  if (mode === "guided" && !keyword) {
    return NextResponse.json({ error: "Le champ 'keyword' est requis en mode guidé" }, { status: 400 });
  }
  if (mode === "auto" && !topic) {
    return NextResponse.json({ error: "Le champ 'topic' est requis en mode autonome" }, { status: 400 });
  }

  const jobId = randomUUID();
  const message = mode === "guided"
    ? `Génère un article SEO optimisé sur le sujet : ${keyword}. Thématiques à couvrir : ${themes || "libre"}. Ton : ${tone}. Longueur cible : ${wordCount} mots. Retourne uniquement du Markdown.`
    : `Génère un article SEO complet de A à Z sur la thématique : ${topic}. Choisis toi-même le keyword principal, le plan, les sous-thématiques, les titres H1/H2/H3, et la structure. Ton : ${tone}. Longueur cible : ${wordCount} mots. Retourne uniquement du Markdown.`;

  try {
    await triggerDustAgent(jobId, message, "DUST_AGENT_SEO_ARTICLE");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ jobId, status: "processing" }, { status: 202 });
}

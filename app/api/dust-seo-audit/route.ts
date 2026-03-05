import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { triggerDustAgent } from "../../lib/dust";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { content } = await req.json().catch(() => ({})) as { content?: string };

  if (!content) {
    return NextResponse.json({ error: "Le champ 'content' est requis" }, { status: 400 });
  }

  const jobId = randomUUID();
  const message = `Effectue un audit SEO complet de ce contenu. Analyse : score SEO /100, densité des mots-clés, structure des titres, méta-description suggérée, lisibilité, points forts, points à améliorer. Retourne un rapport structuré en Markdown.\n\nContenu :\n${content}`;

  try {
    await triggerDustAgent(jobId, message);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ jobId, status: "processing" }, { status: 202 });
}

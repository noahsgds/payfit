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
  const message = `Analyse et corrige ce contenu SEO. Améliore la structure, la densité des mots-clés, les titres H1/H2/H3, et la lisibilité. Retourne le contenu corrigé en Markdown.\n\nContenu :\n${content}`;

  try {
    await triggerDustAgent(jobId, message);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ jobId, status: "processing" }, { status: 202 });
}

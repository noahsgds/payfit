import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { triggerDustAgent } from "../../lib/dust";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { content, links } = await req.json().catch(() => ({})) as { content?: string; links?: string };

  if (!content) return NextResponse.json({ error: "Le champ 'content' est requis" }, { status: 400 });
  if (!links)   return NextResponse.json({ error: "Le champ 'links' est requis" }, { status: 400 });

  const jobId = randomUUID();
  const message = `Intègre naturellement ces backlinks dans le contenu. Place les liens sur des ancres texte pertinentes. Retourne le contenu Markdown enrichi.\n\nLiens :\n${links}\n\nContenu :\n${content}`;

  try {
    await triggerDustAgent(jobId, message, "DUST_AGENT_BACKLINKS");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ jobId, status: "processing" }, { status: 202 });
}

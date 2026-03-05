import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { content, links } = await req.json().catch(() => ({})) as { content?: string; links?: string };

  if (!content) return NextResponse.json({ error: "Le champ 'content' est requis" }, { status: 400 });
  if (!links)   return NextResponse.json({ error: "Le champ 'links' est requis" }, { status: 400 });

  const webhookUrl = process.env.DUST_AGENT_BACKLINKS;
  if (!webhookUrl) {
    return NextResponse.json({ error: "DUST_AGENT_BACKLINKS non configuré" }, { status: 500 });
  }

  const jobId = randomUUID();
  const message = `Intègre naturellement ces backlinks dans le contenu. Place les liens sur des ancres texte pertinentes. Retourne le contenu Markdown enrichi.\n\nLiens :\n${links}\n\nContenu :\n${content}`;

  const dustRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, message }),
  });

  if (!dustRes.ok) {
    return NextResponse.json({ error: `Dust webhook error: ${dustRes.status}` }, { status: 502 });
  }

  return NextResponse.json({ jobId, status: "processing" }, { status: 202 });
}

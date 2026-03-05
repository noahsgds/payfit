import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { content } = await req.json().catch(() => ({})) as { content?: string };

  if (!content) {
    return NextResponse.json({ error: "Le champ 'content' est requis" }, { status: 400 });
  }

  const webhookUrl = process.env.DUST_AGENT_SEO_ANALYZER;
  if (!webhookUrl) {
    return NextResponse.json({ error: "DUST_AGENT_SEO_ANALYZER non configuré" }, { status: 500 });
  }

  const jobId = randomUUID();
  const message = `Analyse et corrige ce contenu SEO. Améliore la structure, la densité des mots-clés, les titres H1/H2/H3, et la lisibilité. Retourne le contenu corrigé en Markdown.\n\nContenu :\n${content}`;

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

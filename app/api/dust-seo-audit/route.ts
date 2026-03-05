import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { content } = await req.json().catch(() => ({})) as { content?: string };

  if (!content) {
    return NextResponse.json({ error: "Le champ 'content' est requis" }, { status: 400 });
  }

  const webhookUrl = process.env.DUST_AGENT_SEO_AUDIT;
  if (!webhookUrl) {
    return NextResponse.json({ error: "DUST_AGENT_SEO_AUDIT non configuré" }, { status: 500 });
  }

  const jobId = randomUUID();
  const message = `Effectue un audit SEO complet de ce contenu. Analyse : score SEO /100, densité des mots-clés, structure des titres, méta-description suggérée, lisibilité, points forts, points à améliorer. Retourne un rapport structuré en Markdown.\n\nContenu :\n${content}`;

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

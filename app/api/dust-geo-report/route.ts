import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const maxDuration = 60;

export async function POST() {
  const webhookUrl = process.env.DUST_AGENT_GEO_REPORT;
  if (!webhookUrl) {
    return NextResponse.json({ error: "DUST_AGENT_GEO_REPORT non configuré" }, { status: 500 });
  }

  const jobId = randomUUID();
  const message = "Génère un rapport GEO complet pour Payfit. Analyse la visibilité géographique, les marchés couverts, les opportunités d'expansion, et les performances par région. Retourne un rapport structuré en Markdown.";

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

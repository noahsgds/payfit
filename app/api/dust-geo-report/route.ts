import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { triggerDustAgent } from "../../lib/dust";

export const maxDuration = 60;

export async function POST() {
  const jobId = randomUUID();
  const message = "Génère un rapport GEO complet pour Payfit. Analyse la visibilité géographique, les marchés couverts, les opportunités d'expansion, et les performances par région. Retourne un rapport structuré en Markdown.";

  try {
    await triggerDustAgent(jobId, message, "DUST_AGENT_GEO_REPORT");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ jobId, status: "processing" }, { status: 202 });
}

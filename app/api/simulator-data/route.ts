import { NextResponse } from "next/server";

const SHEET_ID = "1CMlsd6SHylpivOrxVYfdy0hPrV9d8YNywk_cRn9MboI";
const GID = "1584896221";
const TSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=tsv&gid=${GID}`;

function normalizeType(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t.includes("salaire")) return "Salaires";
  if (t.includes("recrutement")) return "Recrutement";
  if (t.includes("transport")) return "Transport";
  if (t.includes("avantage")) return "Avantages";
  if (t.includes("projection")) return "Projection";
  if (t.includes("pargne")) return "Épargne";
  return raw.trim() || "Autre";
}

export async function GET() {
  try {
    const res = await fetch(TSV_URL, {
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!res.ok) {
      throw new Error(`Google Sheets ${res.status}: ${await res.text().catch(() => "")}`);
    }

    const text = await res.text();
    const lines = text.split("\n").map(l => l.trimEnd()).filter(l => l.trim());

    const rows: SimulatorRow[] = [];

    for (const line of lines) {
      const cols = line.split("\t");
      if (cols.length < 2) continue;

      const timestamp = cols[0]?.trim() || "";

      // Skip header or empty rows
      if (!timestamp || !/\d/.test(timestamp)) continue;

      const typeRaw = cols[1]?.trim() || "";
      const type = normalizeType(typeRaw);
      const prenom = cols[2]?.trim() || "";
      const nom = cols[3]?.trim() || "";
      const email = cols[4]?.trim() || "";
      const entreprise = cols[5]?.trim() || "";
      const telephone = cols[6]?.trim() || "";
      const taille_effectif = cols[7]?.trim() || "";
      const jsonStr = cols[8]?.trim() || "{}";

      let data: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed && typeof parsed === "object") data = parsed as Record<string, unknown>;
      } catch {
        data = {};
      }

      // Parse date to ISO format for grouping
      let dateKey = "";
      try {
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) {
          dateKey = d.toISOString().slice(0, 10);
        }
      } catch {
        dateKey = "";
      }

      rows.push({
        timestamp,
        dateKey,
        type,
        prenom,
        nom,
        email,
        entreprise,
        telephone,
        taille_effectif,
        data,
        has_lead: !!email && email.includes("@"),
        has_data: Object.keys(data).length > 0,
      });
    }

    return NextResponse.json({ rows });
  } catch (e) {
    console.error("[simulator-data]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), rows: [] },
      { status: 500 }
    );
  }
}

export type SimulatorRow = {
  timestamp: string;
  dateKey: string;
  type: string;
  prenom: string;
  nom: string;
  email: string;
  entreprise: string;
  telephone: string;
  taille_effectif: string;
  data: Record<string, unknown>;
  has_lead: boolean;
  has_data: boolean;
};

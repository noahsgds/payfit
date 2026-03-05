"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Users, TrendingUp, Mail, Award, RefreshCw, Filter } from "lucide-react";
import type { SimulatorRow } from "../../api/simulator-data/route";

// ── Colors ─────────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  Salaires: "#1B6EF3",
  Recrutement: "#8B5CF6",
  Transport: "#10B981",
  Avantages: "#F59E0B",
  Projection: "#EF4444",
  Épargne: "#EC4899",
  Autre: "#64748B",
};

const SALARY_BUCKETS = [
  { label: "< 1 500 €", min: 0, max: 1500 },
  { label: "1 500–2 500", min: 1500, max: 2500 },
  { label: "2 500–3 500", min: 2500, max: 3500 },
  { label: "3 500–5 000", min: 3500, max: 5000 },
  { label: "5 000–7 500", min: 5000, max: 7500 },
  { label: "> 7 500 €", min: 7500, max: Infinity },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function avg(nums: number[]) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);
}

function topN<T extends { count: number }>(arr: T[], n = 8) {
  return [...arr].sort((a, b) => b.count - a.count).slice(0, n);
}

function countBy(items: string[]): { name: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const v of items) {
    if (!v) continue;
    map[v] = (map[v] ?? 0) + 1;
  }
  return Object.entries(map).map(([name, count]) => ({ name, count }));
}

// ── KPI card ───────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-semibold text-slate-700 mt-0.5">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ── Custom Tooltip ──────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number; name?: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-slate-500">{p.name ?? "Valeur"} : <span className="font-bold text-slate-800">{p.value.toLocaleString()}</span></p>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SimulatorStatsPage() {
  const [rows, setRows] = useState<SimulatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("Tous");
  const [filterSecteur, setFilterSecteur] = useState("Tous");
  const [filterEffectif, setFilterEffectif] = useState("Tous");

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const load = () => {
    setLoading(true);
    setError("");
    fetch("/api/simulator-data")
      .then(r => r.json())
      .then(d => { setRows((d.rows as SimulatorRow[]) ?? []); })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ── Filter options ─────────────────────────────────────────────────────────
  const allTypes = useMemo(() => {
    const s = new Set(rows.map(r => r.type));
    return ["Tous", ...Array.from(s).sort()];
  }, [rows]);

  const allSecteurs = useMemo(() => {
    const s = new Set(rows.flatMap(r => {
      const v = r.data.secteur;
      return typeof v === "string" && v ? [v] : [];
    }));
    return ["Tous", ...Array.from(s).sort()];
  }, [rows]);

  const allEffectifs = useMemo(() => {
    const s = new Set(rows.map(r => r.taille_effectif).filter(Boolean));
    return ["Tous", ...Array.from(s)];
  }, [rows]);

  // ── Filtered rows ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => rows.filter(r => {
    if (filterType !== "Tous" && r.type !== filterType) return false;
    if (filterSecteur !== "Tous" && r.data.secteur !== filterSecteur) return false;
    if (filterEffectif !== "Tous" && r.taille_effectif !== filterEffectif) return false;
    return true;
  }), [rows, filterType, filterSecteur, filterEffectif]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalSims = filtered.length;
  const leads = filtered.filter(r => r.has_lead).length;
  const leadPct = totalSims ? Math.round((leads / totalSims) * 100) : 0;

  const salaireRows = filtered.filter(r => r.type === "Salaires" && typeof r.data.salaire_brut === "number" && (r.data.salaire_brut as number) > 0);
  const avgSalaireBrut = avg(salaireRows.map(r => r.data.salaire_brut as number));
  const avgCoutEmployeur = avg(salaireRows.map(r => r.data.cout_employeur as number).filter(Boolean));

  const topType = useMemo(() => {
    const counts = countBy(filtered.map(r => r.type));
    return counts.sort((a, b) => b.count - a.count)[0]?.name ?? "—";
  }, [filtered]);

  // ── Chart data ─────────────────────────────────────────────────────────────

  // Donut: by type
  const byType = useMemo(() => {
    return countBy(filtered.map(r => r.type)).sort((a, b) => b.count - a.count);
  }, [filtered]);

  // Line: daily volume
  const dailyVolume = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of filtered) {
      if (r.dateKey) map[r.dateKey] = (map[r.dateKey] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }, [filtered]);

  // Taille d'effectif (col H)
  const byTaille = useMemo(() =>
    topN(countBy(filtered.map(r => r.taille_effectif).filter(Boolean))),
    [filtered]
  );

  // Top secteurs
  const bySecteur = useMemo(() => {
    const vals = filtered.flatMap(r => {
      const v = r.data.secteur;
      return typeof v === "string" && v ? [v] : [];
    });
    return topN(countBy(vals));
  }, [filtered]);

  // Top localisations
  const byLocalisation = useMemo(() => {
    const vals = filtered.flatMap(r => {
      const v = r.data.localisation;
      return typeof v === "string" && v ? [v] : [];
    });
    return topN(countBy(vals));
  }, [filtered]);

  // Salaire distribution
  const salaireDistrib = useMemo(() => {
    return SALARY_BUCKETS.map(b => ({
      label: b.label,
      count: salaireRows.filter(r => {
        const v = r.data.salaire_brut as number;
        return v >= b.min && v < b.max;
      }).length,
    }));
  }, [salaireRows]);

  // Type contrat
  const byContrat = useMemo(() => {
    const vals = salaireRows.flatMap(r => {
      const v = r.data.type_contrat;
      return typeof v === "string" && v ? [v] : [];
    });
    return countBy(vals);
  }, [salaireRows]);

  // Avantages
  const mutuellePct = salaireRows.length
    ? Math.round(salaireRows.filter(r => r.data.mutuelle === "Oui").length / salaireRows.length * 100)
    : 0;
  const ticketsPct = salaireRows.length
    ? Math.round(salaireRows.filter(r => r.data.tickets_resto === "Oui").length / salaireRows.length * 100)
    : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 fade-in">

      {/* Header banner */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0F1629 0%, #1a2744 100%)" }}>
        <div className="absolute right-0 top-0 w-64 h-full opacity-10">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="150" cy="50" r="80" fill="#1B6EF3" />
            <circle cx="50" cy="150" r="60" fill="#8B5CF6" />
          </svg>
        </div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-[#1B6EF3] rounded-full animate-pulse-dot inline-block" />
              <span className="text-xs text-[#1B6EF3] font-semibold uppercase tracking-wider">
                Données live · Google Sheets
              </span>
            </div>
            <h2 className="text-xl font-bold">Analytics Simulateurs</h2>
            <p className="text-slate-400 text-sm mt-1">
              {totalSims} simulation{totalSims > 1 ? "s" : ""} analysée{totalSims > 1 ? "s" : ""} · Profils ICP en temps réel
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-600">
          Erreur de chargement : {error}
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <RefreshCw size={20} className="animate-spin text-[#1B6EF3] mx-auto mb-2" />
          <p className="text-xs text-slate-400">Chargement du Google Sheet…</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Simulations totales" value={totalSims.toString()}
              sub="depuis le début" icon={<TrendingUp size={16} />} color="#1B6EF3" />
            <KpiCard label="Leads qualifiés" value={`${leads} (${leadPct}%)`}
              sub="avec email renseigné" icon={<Mail size={16} />} color="#10B981" />
            <KpiCard label="Salaire brut moyen" value={avgSalaireBrut ? `${avgSalaireBrut.toLocaleString()} €` : "—"}
              sub={`Coût employeur moy. : ${avgCoutEmployeur ? avgCoutEmployeur.toLocaleString() + " €" : "—"}`}
              icon={<Users size={16} />} color="#8B5CF6" />
            <KpiCard label="Simulateur le plus utilisé" value={topType}
              sub={`${byType[0]?.count ?? 0} simulation${(byType[0]?.count ?? 0) > 1 ? "s" : ""}`}
              icon={<Award size={16} />} color="#F59E0B" />
          </div>

          {/* Filter bar */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Filter size={13} />
                Filtres ICP
              </div>
              {[
                { label: "Simulateur", value: filterType, options: allTypes, set: setFilterType },
                { label: "Secteur", value: filterSecteur, options: allSecteurs, set: setFilterSecteur },
                { label: "Taille effectif", value: filterEffectif, options: allEffectifs, set: setFilterEffectif },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{f.label}</span>
                  <select value={f.value} onChange={e => f.set(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 outline-none focus:border-[#1B6EF3]">
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              {(filterType !== "Tous" || filterSecteur !== "Tous" || filterEffectif !== "Tous") && (
                <button onClick={() => { setFilterType("Tous"); setFilterSecteur("Tous"); setFilterEffectif("Tous"); }}
                  className="text-xs text-[#1B6EF3] hover:underline">
                  Réinitialiser
                </button>
              )}
              <span className="ml-auto text-xs text-slate-400">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Row 1: Donut + Daily volume */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Section title="Répartition par simulateur">
              {byType.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Aucune donnée</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={byType} dataKey="count" nameKey="name" cx="50%" cy="50%"
                        innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {byType.map((entry, i) => (
                          <Cell key={i} fill={TYPE_COLORS[entry.name] ?? "#64748B"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number | undefined) => [`${v ?? 0} simulation${(v ?? 0) > 1 ? "s" : ""}`, ""]}
                        contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                    {byType.map(t => (
                      <div key={t.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: TYPE_COLORS[t.name] ?? "#64748B" }} />
                        {t.name} <span className="font-semibold">({t.count})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Section>

            <div className="lg:col-span-2">
              <Section title="Volume quotidien">
                {dailyVolume.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">Aucune donnée</p>
                ) : (
                  <ResponsiveContainer width="100%" height={218}>
                    <LineChart data={dailyVolume}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line type="monotone" dataKey="count" name="Simulations"
                        stroke="#1B6EF3" strokeWidth={2} dot={{ r: 4, fill: "#1B6EF3" }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Section>
            </div>
          </div>

          {/* Row 2: Profils ICP */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Taille effectif */}
            <Section title="Taille d'entreprise (déclarée)">
              {byTaille.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Aucune donnée</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byTaille} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Entreprises" fill="#1B6EF3" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* Top secteurs */}
            <Section title="Top secteurs (simulations Salaires)">
              {bySecteur.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Aucune donnée — les secteurs apparaissent quand les utilisateurs les renseignent</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={bySecteur} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Simulations" fill="#8B5CF6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* Top localisations */}
            <Section title="Top localisations">
              {byLocalisation.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Aucune donnée</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byLocalisation} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Simulations" fill="#10B981" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>
          </div>

          {/* Row 3: Salaires data */}
          {(salaireRows.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Distribution salaires */}
              <div className="lg:col-span-2">
                <Section title={`Distribution salaires bruts (${salaireRows.length} simulations)`}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={salaireDistrib} margin={{ left: 0, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="count" name="Simulations" fill="#1B6EF3" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Section>
              </div>

              {/* Avantages + Contrat */}
              <Section title="Profil moyen (Salaires)">
                <div className="space-y-4">
                  {/* Stats numériques */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Salaire brut moy.", value: avgSalaireBrut ? `${avgSalaireBrut.toLocaleString()} €` : "—" },
                      { label: "Coût employeur moy.", value: avgCoutEmployeur ? `${avgCoutEmployeur.toLocaleString()} €` : "—" },
                      { label: "Mutuelle", value: `${mutuellePct}%` },
                      { label: "Tickets resto", value: `${ticketsPct}%` },
                    ].map(s => (
                      <div key={s.label} className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-400">{s.label}</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{s.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Type contrat */}
                  {byContrat.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">Types de contrat</p>
                      <div className="space-y-1.5">
                        {byContrat.sort((a, b) => b.count - a.count).slice(0, 4).map(c => (
                          <div key={c.name} className="flex items-center justify-between">
                            <span className="text-xs text-slate-600">{c.name}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#1B6EF3] rounded-full"
                                  style={{ width: `${Math.round(c.count / salaireRows.length * 100)}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-slate-700 w-6 text-right">{c.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            </div>
          )}

          {/* Raw leads table */}
          {leads > 0 && (
            <Section title={`${leads} lead${leads > 1 ? "s" : ""} qualifié${leads > 1 ? "s" : ""} (avec email)`}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Date", "Simulateur", "Prénom", "Nom", "Email", "Entreprise", "Taille"].map(h => (
                        <th key={h} className="text-left text-slate-400 font-semibold pb-2 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.filter(r => r.has_lead).slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-2 pr-4 text-slate-500">{r.timestamp.slice(0, 10)}</td>
                        <td className="py-2 pr-4">
                          <span className="px-2 py-0.5 rounded-full text-white text-[10px] font-medium"
                            style={{ backgroundColor: TYPE_COLORS[r.type] ?? "#64748B" }}>
                            {r.type}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-slate-700">{r.prenom}</td>
                        <td className="py-2 pr-4 text-slate-700">{r.nom}</td>
                        <td className="py-2 pr-4 text-[#1B6EF3]">{r.email}</td>
                        <td className="py-2 pr-4 text-slate-600">{r.entreprise}</td>
                        <td className="py-2 pr-4 text-slate-500">{r.taille_effectif}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.filter(r => r.has_lead).length > 50 && (
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    Affichage des 50 premiers leads — {filtered.filter(r => r.has_lead).length - 50} autres masqués
                  </p>
                )}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

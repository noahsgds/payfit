"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { RefreshCw, ExternalLink, TrendingUp, AlertCircle, TrendingDown } from "lucide-react";
import { useSeoData } from "../../context/SeoDataContext";
import type { SerpApiResponse, SerpKeywordData } from "../../api/serp/route";
import CustomKeywordAnalyzer from "./CustomKeywordAnalyzer";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TREND_COLORS: Record<string, string> = {
  PayFit: "#1B6EF3",
  "logiciel paie": "#8B5CF6",
  "logiciel RH": "#F59E0B",
  "logiciel SIRH": "#10B981",
  "bulletin de paie": "#EF4444",
  "fiche de paie": "#EC4899",
};

function positionBand(pos: number | null): "top3" | "top10" | "top20" | "top100" | "top200" | "none" {
  if (pos === null) return "none";
  if (pos <= 3) return "top3";
  if (pos <= 10) return "top10";
  if (pos <= 20) return "top20";
  if (pos <= 100) return "top100";
  return "top200";
}

// ─── Trends helpers ────────────────────────────────────────────────────────────

function avg(series: number[]): number {
  if (!series.length) return 0;
  return Math.round(series.reduce((a, b) => a + b, 0) / series.length);
}

function trendPct(series: number[]): number {
  if (series.length < 4) return 0;
  const mid = Math.floor(series.length / 2);
  const first = avg(series.slice(0, mid));
  const last = avg(series.slice(mid));
  if (first === 0) return 0;
  return Math.round(((last - first) / first) * 100);
}

function visibilityScore(results: SerpKeywordData[]): number {
  if (!results.length) return 0;
  const sum = results.reduce((acc, r) => acc + (r.position ? 100 / r.position : 0), 0);
  const max = results.length * 100; // if all #1
  return Math.round((sum / max) * 100);
}

function topCompetitors(results: SerpKeywordData[]): { domain: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const r of results) {
    for (const d of r.competitorsAbove) {
      counts[d] = (counts[d] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function PositionBadge({ position }: { position: number | null }) {
  if (position === null)
    return <span className="text-xs text-slate-400 font-medium">—</span>;
  const color =
    position <= 3 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : position <= 10 ? "bg-blue-50 text-blue-700 border-blue-200"
    : position <= 20 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs font-bold border ${color}`}>
      {position}
    </span>
  );
}

const STORAGE_KEY = "serpData_v1";

// ─── Component ────────────────────────────────────────────────────────────────

export default function SEOPositioningPage() {
  const { seoData, loading: trendsLoading } = useSeoData();
  const [serpData, setSerpData] = useState<SerpApiResponse | null>(null);
  const [serpLoading, setSerpLoading] = useState(false);
  const [serpError, setSerpError] = useState<string | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSerpData(JSON.parse(stored) as SerpApiResponse);
    } catch { /* ignore */ }
  }, []);

  const refresh = useCallback(async () => {
    setSerpLoading(true);
    setSerpError(null);
    try {
      const res = await fetch("/api/serp", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as SerpApiResponse;
      setSerpData(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      setSerpError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSerpLoading(false);
    }
  }, []);

  // ─── Computed stats ───────────────────────────────────────────────────────

  const results = serpData?.results ?? [];
  const competitors = topCompetitors(results);

  const distribution = {
    "Top 3": results.filter((r) => positionBand(r.position) === "top3").length,
    "Top 10": results.filter((r) => positionBand(r.position) === "top10").length,
    "Top 20": results.filter((r) => positionBand(r.position) === "top20").length,
    "Top 100": results.filter((r) => positionBand(r.position) === "top100").length,
    "Top 200": results.filter((r) => positionBand(r.position) === "top200").length,
    "Non classé": results.filter((r) => positionBand(r.position) === "none").length,
  };

  const series = seoData?.trends?.series ?? {};

  const avgChartData = Object.keys(TREND_COLORS)
    .map((kw) => ({ keyword: kw, avg: avg(series[kw] ?? []) }))
    .sort((a, b) => b.avg - a.avg);

  const radarData = Object.keys(TREND_COLORS).map((kw) => ({
    subject: kw,
    value: avg(series[kw] ?? []),
    fullMark: 100,
  }));

  const trendData = Object.keys(TREND_COLORS).map((kw) => ({
    kw,
    pct: trendPct(series[kw] ?? []),
    avg: avg(series[kw] ?? []),
  }));

  const trendChartData = (seoData?.trends?.labels ?? []).map((label, i) => {
    const entry: Record<string, string | number> = { date: label };
    for (const kw of Object.keys(TREND_COLORS)) {
      entry[kw] = seoData?.trends.series[kw]?.[i] ?? 0;
    }
    return entry;
  });

  const fetchedAt = serpData?.fetchedAt
    ? new Date(serpData.fetchedAt).toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Positionnement SEO</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {fetchedAt
              ? <>Dernière analyse : {fetchedAt}</>
              : "Cliquez sur Rafraîchir pour lancer une analyse"}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={serpLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw size={14} className={serpLoading ? "animate-spin" : ""} />
          {serpLoading ? "Analyse en cours…" : "Rafraîchir"}
        </button>
      </div>

      {serpError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={14} />
          {serpError}
        </div>
      )}


      {/* ── Google Trends ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Google Trends — intérêt de recherche</h3>
            <p className="text-xs text-slate-400">Données réelles Google Trends FR · 90 derniers jours</p>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg font-medium">Live</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 mt-3 mb-4">
          {Object.keys(TREND_COLORS).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TREND_COLORS[k] }} />
              <span className="text-xs text-slate-500">{k}</span>
            </div>
          ))}
        </div>

        {trendsLoading ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-400">Chargement…</div>
        ) : trendChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={Math.floor(trendChartData.length / 8)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
              {Object.keys(TREND_COLORS).map((k) => (
                <Line key={k} type="monotone" dataKey={k} stroke={TREND_COLORS[k]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-sm text-slate-400">Aucune donnée disponible</div>
        )}
      </div>

      {/* ── Trends extra charts ── */}
      {!trendsLoading && trendChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Intérêt moyen */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 text-sm mb-0.5">Intérêt moyen / 90j</h3>
            <p className="text-xs text-slate-400 mb-4">Score Google Trends moyen par mot-clé</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={avgChartData} layout="vertical" margin={{ left: 0, right: 24 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="keyword" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={100} />
                <Tooltip
                  formatter={(v: number | undefined) => [`${v ?? 0}/100`, "Intérêt moyen"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Bar dataKey="avg" radius={[0, 6, 6, 0]}>
                  {avgChartData.map((entry) => (
                    <Cell key={entry.keyword} fill={TREND_COLORS[entry.keyword] ?? "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 text-sm mb-0.5">Profil des mots-clés</h3>
            <p className="text-xs text-slate-400 mb-2">Intérêt relatif sur 90 jours</p>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#64748b" }} />
                <Radar dataKey="value" stroke="#1B6EF3" fill="#1B6EF3" fillOpacity={0.15} strokeWidth={2} />
                <Tooltip
                  formatter={(v: number | undefined) => [`${v ?? 0}/100`, "Intérêt"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Tendances récentes */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 text-sm mb-0.5">Tendance récente</h3>
            <p className="text-xs text-slate-400 mb-4">Évolution 2e moitié vs 1re moitié de période</p>
            <div className="space-y-2.5">
              {trendData.map(({ kw, pct, avg: kwAvg }) => (
                <div key={kw} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TREND_COLORS[kw] }} />
                  <span className="text-xs text-slate-600 flex-1 truncate">{kw}</span>
                  <span className="text-xs text-slate-400 tabular-nums w-8 text-right">{kwAvg}</span>
                  <span className={`flex items-center gap-0.5 text-xs font-semibold tabular-nums w-14 justify-end ${
                    pct > 0 ? "text-emerald-600" : pct < 0 ? "text-red-500" : "text-slate-400"
                  }`}>
                    {pct > 0
                      ? <TrendingUp size={11} />
                      : pct < 0
                      ? <TrendingDown size={11} />
                      : null}
                    {pct > 0 ? "+" : ""}{pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── SERP Table + Competitors (side by side) ── */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Positions table */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">Positions Google — PayFit.com</h3>
              <p className="text-xs text-slate-400 mt-0.5">France · 200 résultats analysés · Serper.dev</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Mot-clé</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Pos.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 hidden sm:table-cell">Concurrents au-dessus</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 hidden md:table-cell">URL</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">{row.keyword}</span>
                    {row.keyword === "payfit" && (
                      <span className="ml-2 text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-md">brand</span>
                    )}
                  </td>
                    <td className="px-4 py-3"><PositionBadge position={row.position} /></td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {row.competitorsAbove.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.competitorsAbove.slice(0, 4).map((d) => (
                            <span key={d} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">{d}</span>
                          ))}
                          {row.competitorsAbove.length > 4 && (
                            <span className="text-xs text-slate-400">+{row.competitorsAbove.length - 4}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-500 font-medium">Aucun</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {row.url ? (
                        <a href={row.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate max-w-[180px]">
                          <ExternalLink size={10} />
                          {row.url.replace("https://", "").split("?")[0].slice(0, 40)}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-300">Non classé</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Competitors chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 text-sm mb-1">Top concurrents</h3>
            <p className="text-xs text-slate-400 mb-4">Domaines apparaissant le plus souvent devant PayFit</p>
            {competitors.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={competitors} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" domain={[0, results.length]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="domain" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip
                    formatter={(v: number | undefined) => [`${v ?? 0} keyword${(v ?? 0) > 1 ? "s" : ""}`, "Présences"]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {competitors.map((_, idx) => (
                      <Cell key={idx} fill={idx < 3 ? "#ef4444" : idx < 6 ? "#f59e0b" : "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-slate-400">Aucun concurrent détecté</div>
            )}
          </div>
        </div>
      )}

      {/* ── Distribution ── */}
      {results.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-1">Distribution des positions</h3>
          <p className="text-xs text-slate-400 mb-4">Répartition des {results.length} keywords suivis</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {(Object.entries(distribution) as [string, number][]).map(([label, count]) => {
              const colors: Record<string, string> = {
                "Top 3": "bg-emerald-50 border-emerald-200 text-emerald-700",
                "Top 10": "bg-blue-50 border-blue-200 text-blue-700",
                "Top 20": "bg-indigo-50 border-indigo-200 text-indigo-700",
                "Top 100": "bg-amber-50 border-amber-200 text-amber-700",
                "Top 200": "bg-orange-50 border-orange-200 text-orange-700",
                "Non classé": "bg-slate-100 border-slate-200 text-slate-500",
              };
              return (
                <div key={label} className={`flex flex-col items-center p-3 rounded-xl border ${colors[label]}`}>
                  <span className="text-2xl font-bold">{count}</span>
                  <span className="text-xs font-medium mt-0.5">{label}</span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-3 rounded-full overflow-hidden flex gap-0.5">
            {(Object.entries(distribution) as [string, number][]).map(([label, count]) => {
              const pct = (count / results.length) * 100;
              if (!pct) return null;
              const bgs: Record<string, string> = {
                "Top 3": "bg-emerald-500",
                "Top 10": "bg-blue-500",
                "Top 20": "bg-indigo-400",
                "Top 100": "bg-amber-400",
                "Top 200": "bg-orange-400",
                "Non classé": "bg-slate-300",
              };
              return <div key={label} className={`${bgs[label]} rounded-full`} style={{ width: `${pct}%` }} title={`${label}: ${count}`} />;
            })}
          </div>
        </div>
      )}

      {/* ── Analyse personnalisée ── */}
      <CustomKeywordAnalyzer />

      {/* ── Empty state ── */}
      {!serpLoading && results.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 shadow-sm flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <TrendingUp size={20} className="text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Aucune donnée SERP</p>
            <p className="text-xs text-slate-400 mt-1">Cliquez sur Rafraîchir pour analyser les positions de PayFit.com</p>
          </div>
          <button
            onClick={refresh}
            disabled={serpLoading}
            className="mt-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Lancer l&apos;analyse
          </button>
        </div>
      )}

    </div>
  );
}

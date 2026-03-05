"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe, Brain, Eye, TrendingUp, RefreshCw, AlertCircle,
  CheckCircle2, Clock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import type { GeoApiResponse } from "../../api/geo-data/route";

// ─── Constants ────────────────────────────────────────────────────────────────

const ENGINE_META: Record<string, { logo: string; color: string }> = {
  "ChatGPT":      { logo: "🤖", color: "#10B981" },
  "Gemini":       { logo: "✨", color: "#3B82F6" },
  "Llama (Groq)": { logo: "⚡", color: "#F59E0B" },
  "Mistral":      { logo: "🌊", color: "#8B5CF6" },
  "Llama-3.2 (OR)":   { logo: "🦙", color: "#EC4899" },
};

const SECTOR_AVG = 52;

// ─── Rank cell ────────────────────────────────────────────────────────────────

function RankCell({ rank }: { rank: number | null }) {
  if (rank === null) {
    return (
      <div className="w-full h-8 rounded-lg bg-slate-50 flex items-center justify-center">
        <span className="text-slate-300 text-xs">—</span>
      </div>
    );
  }
  const styles: Record<number, string> = {
    1: "bg-emerald-100 text-emerald-700 font-bold ring-1 ring-emerald-300",
    2: "bg-blue-100   text-blue-700   font-semibold",
    3: "bg-blue-50    text-blue-600",
  };
  const cls = styles[rank] ?? "bg-amber-50 text-amber-600";
  return (
    <div className={`w-full h-8 rounded-lg flex items-center justify-center text-xs ${cls}`}>
      #{rank}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GEOPositioningPage() {
  const [data, setData]       = useState<GeoApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/geo-data${force ? "?force=1" : ""}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const visData = data
    ? data.engines.map((e) => ({
        name:   e.engine,
        payfit: e.visibility,
        color:  ENGINE_META[e.engine]?.color ?? "#64748b",
      }))
    : [];

  const totalSlots = (data?.engines[0]?.themes.length ?? 0) * (data?.engines.length ?? 0);
  const maxCompCount = data?.topCompetitors[0]?.count ?? 1;

  return (
    <div className="p-6 space-y-6 fade-in">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-[#0F1629] via-[#1a2744] to-[#0d1a3a] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-blue-400" />
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Generative Engine Optimization
            </span>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            {loading ? "Analyse…" : "Rafraîchir"}
          </button>
        </div>

        <h2 className="text-xl font-bold mb-1">Visibilité PayFit dans les IA génératives</h2>
        <p className="text-slate-400 text-sm mb-4">
          8 thèmes · {data ? data.engines.length : "5"} moteurs · 1 prompt/moteur · cache 24h
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Score GEO global", value: loading ? "…" : data ? `${data.globalVisibility}%` : "—",                               icon: <Globe size={14} /> },
            { label: "Moteurs actifs",   value: loading ? "…" : data ? `${data.engines.length}`     : "—",                               icon: <Brain size={14} /> },
            { label: "Thèmes analysés",  value: loading ? "…" : data ? `${data.engines[0]?.themes.length ?? 0}` : "—",                   icon: <Eye size={14} /> },
            { label: "Rang moyen",       value: loading ? "…" : data?.globalAvgRank != null ? `#${data.globalAvgRank}` : "—",            icon: <TrendingUp size={14} /> },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-blue-300 mb-1">
                {s.icon}
                <span className="text-xs">{s.label}</span>
              </div>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {data && (
          <div className="flex items-center gap-1.5 mt-3">
            {data.cached
              ? <Clock size={11} className="text-slate-500" />
              : <CheckCircle2 size={11} className="text-emerald-400" />}
            <span className="text-xs text-slate-500">
              {data.cached ? "Cache · " : "Frais · "}
              {new Date(data.timestamp).toLocaleString("fr-FR")}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* ── Positioning matrix ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 text-sm mb-0.5">Matrice de positionnement</h3>
        <p className="text-xs text-slate-400 mb-4">Rang de PayFit par thème et par moteur IA · — = non cité</p>

        {loading ? (
          <div className="space-y-2">{[...Array(8)].map((_, i) => (
            <div key={i} className="h-8 bg-slate-50 rounded-xl animate-pulse" />
          ))}</div>
        ) : data && data.matrix.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-slate-400 font-medium py-1.5 pr-3 w-40">Thème</th>
                  {data.engineNames.map((name) => (
                    <th key={name} className="text-center text-slate-400 font-medium py-1.5 px-1 min-w-[80px]">
                      <span className="mr-1">{ENGINE_META[name]?.logo ?? "🤖"}</span>{name}
                    </th>
                  ))}
                  <th className="text-center text-slate-400 font-medium py-1.5 px-1 min-w-[60px]">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.matrix.map((row) => {
                  const cited = row.ranks.filter((r) => r !== null).length;
                  const score = Math.round((cited / row.ranks.length) * 100);
                  return (
                    <tr key={row.label}>
                      <td className="py-1.5 pr-3 text-slate-600 font-medium whitespace-nowrap">{row.label}</td>
                      {row.ranks.map((rank, i) => (
                        <td key={i} className="py-1 px-1">
                          <RankCell rank={rank} />
                        </td>
                      ))}
                      <td className="py-1 px-1">
                        <div className={`w-full h-8 rounded-lg flex items-center justify-center text-xs font-semibold
                          ${score === 100 ? "bg-emerald-100 text-emerald-700" :
                            score >= 60   ? "bg-blue-100 text-blue-700" :
                            score >= 40   ? "bg-amber-100 text-amber-700" :
                                            "bg-red-50 text-red-400"}`}>
                          {score}%
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">Aucune donnée — cliquez sur Rafraîchir</p>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-50">
          {[
            { label: "#1 — Leader",      cls: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300" },
            { label: "#2 — Bon",         cls: "bg-blue-100 text-blue-700" },
            { label: "#3 — Visible",     cls: "bg-blue-50 text-blue-600" },
            { label: "#4-5 — Marginal",  cls: "bg-amber-50 text-amber-600" },
            { label: "— Non cité",       cls: "bg-slate-50 text-slate-300" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-7 h-5 rounded text-[10px] flex items-center justify-center ${l.cls}`}>
                {l.label.split(" ")[0]}
              </div>
              <span className="text-xs text-slate-400">{l.label.split(" — ")[1]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Visibility per engine */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-0.5">Visibilité par moteur</h3>
          <p className="text-xs text-slate-400 mb-3">% de thèmes où PayFit apparaît · ligne = moy. secteur</p>
          {loading ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">Chargement…</div>
          ) : visData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={visData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  formatter={(v: number | undefined) => [`${v ?? 0}%`, "Visibilité"]}
                />
                <ReferenceLine y={SECTOR_AVG} stroke="#CBD5E1" strokeDasharray="4 3"
                  label={{ value: "moy. secteur", position: "insideTopRight", fontSize: 9, fill: "#94a3b8" }} />
                <Bar dataKey="payfit" radius={[6, 6, 0, 0]}>
                  {visData.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">Aucune donnée</div>
          )}
        </div>

        {/* Top competitors */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-0.5">Concurrents les plus cités</h3>
          <p className="text-xs text-slate-400 mb-4">Fréquence sur l&apos;ensemble des réponses IA</p>
          {loading ? (
            <div className="space-y-2.5">{[...Array(6)].map((_, i) => (
              <div key={i} className="h-7 bg-slate-50 rounded-xl animate-pulse" />
            ))}</div>
          ) : data && data.topCompetitors.length > 0 ? (
            <div className="space-y-2.5">
              {data.topCompetitors.map(({ name, count }) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 capitalize w-20 flex-shrink-0">{name}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400 rounded-full"
                      style={{ width: `${Math.round((count / maxCompCount) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums w-8 text-right">{count}×</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center pt-8">Aucune donnée</p>
          )}
        </div>
      </div>

      {/* ── Raw responses ── */}
      {!loading && data && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-0.5">Réponses brutes par moteur</h3>
          <p className="text-xs text-slate-400 mb-4">Listes ordonnées retournées par chaque IA</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.engines.map((engine) => {
              const meta = ENGINE_META[engine.engine] ?? { logo: "🤖", color: "#64748b" };
              return (
                <div key={engine.engine} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{meta.logo}</span>
                    <span className="text-xs font-semibold text-slate-700">{engine.engine}</span>
                    <span className="ml-auto text-xs font-bold" style={{ color: meta.color }}>
                      {engine.visibility}%
                    </span>
                  </div>
                  <pre className="text-[11px] text-slate-500 whitespace-pre-wrap leading-relaxed font-mono">
                    {engine.fullResponse || "—"}
                  </pre>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

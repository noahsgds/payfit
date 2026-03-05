"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Brain,
  Zap,
  Eye,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import MetricCard from "../../components/MetricCard";
import type { GeoApiResponse } from "../../api/geo-data/route";

// ─── Constants ────────────────────────────────────────────────────────────────

const ENGINE_META: Record<string, { logo: string; color: string }> = {
  ChatGPT: { logo: "🤖", color: "#10B981" },
  Gemini:  { logo: "✨", color: "#3B82F6" },
};

const RADAR_AVG: Record<string, number> = {
  ChatGPT: 55, Gemini: 52,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function GEOPositioningPage() {
  const [data, setData] = useState<GeoApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/geo-data${force ? "?force=1" : ""}`);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const json: GeoApiResponse = await res.json();
      setData(json);
      setLastFetch(new Date(json.timestamp));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const globalVisibility = data
    ? Math.round(
        (data.summary.chatgpt.visibility + data.summary.gemini.visibility) / 2
      )
    : null;

  const totalMentions = data
    ? data.summary.chatgpt.mentions + data.summary.gemini.mentions
    : null;

  const globalAvgRank = data
    ? (() => {
        const ranks = [data.summary.chatgpt.avgRank, data.summary.gemini.avgRank].filter(
          (r): r is number => r !== null
        );
        return ranks.length
          ? Math.round((ranks.reduce((a, b) => a + b, 0) / ranks.length) * 10) / 10
          : null;
      })()
    : null;

  const radarData = data
    ? Object.keys(ENGINE_META).map((e) => ({
        subject: e,
        payfit:
          e === "ChatGPT"
            ? data.summary.chatgpt.visibility
            : data.summary.gemini.visibility,
        average: RADAR_AVG[e] ?? 50,
      }))
    : [];

  const queryScoreData = data
    ? data.queries.map((q) => {
        const mentioned = q.engines.filter((e) => e.mentioned).length;
        return {
          query: q.theme,
          score: Math.round((mentioned / q.engines.length) * 100),
        };
      })
    : [];

  // ── Top competitors mentioned across all queries/engines ──────────────────
  const competitorCounts: Record<string, number> = {};
  if (data) {
    for (const q of data.queries) {
      for (const e of q.engines) {
        for (const c of e.competitors) {
          competitorCounts[c] = (competitorCounts[c] ?? 0) + 1;
        }
      }
    }
  }
  const topCompetitors = Object.entries(competitorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // ── Per-engine summary ─────────────────────────────────────────────────────
  const engineSummaries = data
    ? Object.keys(ENGINE_META).map((e) => {
        const sum = e === "ChatGPT" ? data.summary.chatgpt : data.summary.gemini;
        // Best snippet for this engine
        const snippets = data.queries
          .flatMap((q) => q.engines.filter((r) => r.engine === e && r.snippet))
          .map((r) => r.snippet);
        const snippet = snippets[0] ?? "";
        // Sample query (first one where mentioned)
        const sampleQuery = data.queries.find((q) =>
          q.engines.find((r) => r.engine === e && r.mentioned)
        )?.query ?? data.queries[0]?.query ?? "";
        return { engine: e, ...sum, snippet, sampleQuery };
      })
    : [];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 fade-in">

      {/* GEO Hero */}
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
            {loading ? "Analyse en cours…" : "Rafraîchir"}
          </button>
        </div>
        <h2 className="text-xl font-bold mb-1">
          Visibilité PayFit dans les IA génératives
        </h2>
        <p className="text-slate-400 text-sm mb-4">
          Requêtes réelles envoyées à ChatGPT et Gemini · Résultats live
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Score GEO global",
              value: loading ? "…" : globalVisibility !== null ? `${globalVisibility}%` : "—",
              icon: <Globe size={14} />,
            },
            {
              label: "Moteurs IA testés",
              value: "2",
              icon: <Brain size={14} />,
            },
            {
              label: "Mentions détectées",
              value: loading ? "…" : totalMentions !== null ? `${totalMentions}` : "—",
              icon: <Eye size={14} />,
            },
            {
              label: "Position moy.",
              value: loading ? "…" : globalAvgRank !== null ? `#${globalAvgRank}` : "—",
              icon: <TrendingUp size={14} />,
            },
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
        {lastFetch && (
          <p className="text-xs text-slate-500 mt-3">
            Dernière analyse : {lastFetch.toLocaleString("fr-FR")} · Cache 2h
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Score GEO Moyen"
          value={loading ? "…" : globalVisibility !== null ? `${globalVisibility}%` : "—"}
          icon={<Globe size={16} />}
          color="#3B82F6"
        />
        <MetricCard
          title="ChatGPT visibilité"
          value={loading ? "…" : data ? `${data.summary.chatgpt.visibility}%` : "—"}
          icon={<Zap size={16} />}
          color="#10B981"
        />
        <MetricCard
          title="Gemini visibilité"
          value={loading ? "…" : data ? `${data.summary.gemini.visibility}%` : "—"}
          icon={<Eye size={16} />}
          color="#3B82F6"
        />
        <MetricCard
          title="Position moy. IA"
          value={loading ? "…" : globalAvgRank !== null ? `#${globalAvgRank}` : "—"}
          icon={<TrendingUp size={16} />}
          color="#F59E0B"
        />
      </div>

      {/* Radar + per-engine cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Radar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-1">
            Couverture par moteur IA
          </h3>
          <p className="text-xs text-slate-400 mb-4">PayFit vs moyenne secteur RH</p>
          {loading ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">
              Chargement…
            </div>
          ) : radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b" }} />
                <Radar name="PayFit" dataKey="payfit" stroke="#1B6EF3" fill="#1B6EF3" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Moyenne" dataKey="average" stroke="#CBD5E1" fill="#CBD5E1" fillOpacity={0.1} strokeWidth={1} strokeDasharray="3 3" />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">
              Aucune donnée
            </div>
          )}
          <div className="flex gap-4 justify-center mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 rounded bg-[#1B6EF3]" />
              <span className="text-xs text-slate-500">PayFit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 rounded bg-slate-300" />
              <span className="text-xs text-slate-500">Moyenne secteur</span>
            </div>
          </div>
        </div>

        {/* Per-engine cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {loading
            ? [1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-1/2 mb-3" />
                  <div className="h-2 bg-slate-100 rounded w-full mb-2" />
                  <div className="h-16 bg-slate-50 rounded-xl" />
                </div>
              ))
            : engineSummaries.map((es) => {
                const meta = ENGINE_META[es.engine];
                return (
                  <div
                    key={es.engine}
                    className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{meta.logo}</span>
                        <span className="font-semibold text-slate-900 text-sm">{es.engine}</span>
                      </div>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-lg"
                        style={{ color: meta.color, backgroundColor: `${meta.color}18` }}
                      >
                        {es.visibility}%
                      </span>
                    </div>

                    {/* Visibility bar */}
                    <div className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-500">Visibilité</span>
                        <span className="text-xs font-bold" style={{ color: meta.color }}>
                          {es.mentions}/{es.total} requêtes
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${es.visibility}%`, backgroundColor: meta.color }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="text-sm font-bold text-slate-900">
                          {es.avgRank !== null ? `#${es.avgRank}` : "—"}
                        </p>
                        <p className="text-xs text-slate-400">Position moy.</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="text-sm font-bold text-slate-900">{es.mentions}</p>
                        <p className="text-xs text-slate-400">Mentions</p>
                      </div>
                    </div>

                    {/* Snippet */}
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-xs text-slate-400 mb-1 font-mono truncate">
                        &ldquo;{es.sampleQuery}&rdquo;
                      </p>
                      <p className="text-xs text-slate-600 italic leading-relaxed line-clamp-2">
                        {es.snippet || <span className="text-slate-300">PayFit non mentionné</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Query results table */}
      {data && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-1">Résultats par requête</h3>
          <p className="text-xs text-slate-400 mb-4">PayFit mentionné ? · Concurrents cités</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs text-slate-400 font-medium pb-2 pr-4">Requête</th>
                  {Object.keys(ENGINE_META).map((e) => (
                    <th key={e} className="text-center text-xs text-slate-400 font-medium pb-2 px-3">
                      {e}
                    </th>
                  ))}
                  <th className="text-left text-xs text-slate-400 font-medium pb-2 pl-4">Concurrents cités</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.queries.map((q) => (
                  <tr key={q.query} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="text-xs font-medium text-slate-700">{q.theme}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[260px]">{q.query}</p>
                    </td>
                    {Object.keys(ENGINE_META).map((e) => {
                      const r = q.engines.find((x) => x.engine === e);
                      return (
                        <td key={e} className="py-3 px-3 text-center">
                          {r?.mentioned ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <CheckCircle2 size={14} className="text-emerald-500" />
                              <span className="text-xs text-slate-500">#{r.rank}</span>
                            </div>
                          ) : (
                            <XCircle size={14} className="text-red-300 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 pl-4">
                      <div className="flex flex-wrap gap-1">
                        {Array.from(
                          new Set(q.engines.flatMap((e) => e.competitors))
                        )
                          .slice(0, 4)
                          .map((c) => (
                            <span
                              key={c}
                              className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-lg capitalize"
                            >
                              {c}
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Score chart + top competitors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Query score */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-1">Score GEO par thématique</h3>
          <p className="text-xs text-slate-400 mb-4">% de moteurs IA qui citent PayFit</p>
          {loading ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">Chargement…</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={queryScoreData} layout="vertical">
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  dataKey="query"
                  type="category"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  formatter={(v: number | undefined) => [`${v ?? 0}%`, "Score GEO"]}
                />
                <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                  {queryScoreData.map((entry) => (
                    <Cell
                      key={entry.query}
                      fill={entry.score >= 75 ? "#10B981" : entry.score >= 50 ? "#3B82F6" : "#F59E0B"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top competitors */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-1">Concurrents les plus cités</h3>
          <p className="text-xs text-slate-400 mb-4">
            Solutions mentionnées par les IA sur nos thématiques
          </p>
          {loading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 bg-slate-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : topCompetitors.length > 0 ? (
            <div className="space-y-2.5">
              {topCompetitors.map(({ name, count }) => {
                const total = data!.queries.length * Object.keys(ENGINE_META).length;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 capitalize w-20 flex-shrink-0">{name}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 tabular-nums w-12 text-right">
                      {count} fois
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center pt-8">Aucune donnée</p>
          )}
        </div>
      </div>

    </div>
  );
}

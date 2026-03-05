"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe, Brain, Eye, TrendingUp, RefreshCw, AlertCircle,
  CheckCircle2, XCircle, Clock,
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
  "Gemma (OR)":   { logo: "💎", color: "#EC4899" },
};

// Sector benchmark (estimated avg for HR software players)
const SECTOR_AVG = 52;

// ─── Highlight PayFit in a text ───────────────────────────────────────────────
function Highlight({ text }: { text: string }) {
  const parts = text.split(/(payfit)/gi);
  return (
    <>
      {parts.map((p, i) =>
        /payfit/i.test(p) ? (
          <mark key={i} className="bg-blue-100 text-blue-700 rounded px-0.5 not-italic font-semibold">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
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
        name:    e.engine,
        payfit:  e.visibility,
        color:   ENGINE_META[e.engine]?.color ?? "#64748b",
      }))
    : [];

  const scoreData = data
    ? (() => {
        // Per theme: how many engines cite PayFit?
        const themes = data.engines[0]?.themes ?? [];
        return themes.map((t, i) => {
          const citedBy = data.engines.filter((e) => e.themes[i]?.mentioned).length;
          return {
            label: t.label,
            score: Math.round((citedBy / data.engines.length) * 100),
          };
        });
      })()
    : [];

  const totalThemes = (data?.engines[0]?.themes.length ?? 0) * (data?.engines.length ?? 0);

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
          1 prompt par moteur · ChatGPT + Gemini · Cache 24h
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Score GEO global",   value: loading ? "…" : data ? `${data.globalVisibility}%`  : "—", icon: <Globe size={14} /> },
            { label: "Moteurs testés",      value: "2",                                                          icon: <Brain size={14} /> },
            { label: "Thèmes analysés",     value: loading ? "…" : data ? `${data.engines[0]?.themes.length ?? 0}` : "—", icon: <Eye size={14} /> },
            { label: "Position moy.",       value: loading ? "…" : data?.globalAvgRank != null ? `#${data.globalAvgRank}` : "—", icon: <TrendingUp size={14} /> },
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
              {data.cached ? "Depuis le cache · " : "Données fraîches · "}
              {new Date(data.timestamp).toLocaleString("fr-FR")}
            </span>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* ── Radar + Competitors ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Visibility per engine */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-0.5">Visibilité par moteur IA</h3>
          <p className="text-xs text-slate-400 mb-3">% de thèmes où PayFit est cité · ligne = moyenne secteur</p>
          {loading ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">Chargement…</div>
          ) : visData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={visData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  formatter={(v: number | undefined) => [`${v ?? 0}%`, "Visibilité PayFit"]}
                />
                <ReferenceLine y={SECTOR_AVG} stroke="#CBD5E1" strokeDasharray="4 3" label={{ value: "moy. secteur", position: "insideTopRight", fontSize: 9, fill: "#94a3b8" }} />
                <Bar dataKey="payfit" radius={[6, 6, 0, 0]}>
                  {visData.map((e) => (
                    <Cell key={e.name} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">Aucune donnée</div>
          )}
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {visData.map((e) => (
              <div key={e.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: e.color }} />
                <span className="text-xs text-slate-500">{e.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top competitors */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-0.5">Concurrents les plus cités</h3>
          <p className="text-xs text-slate-400 mb-4">Sur l&apos;ensemble des réponses IA</p>
          {loading ? (
            <div className="space-y-2.5">{[1,2,3,4,5].map((i) => <div key={i} className="h-7 bg-slate-50 rounded-xl animate-pulse" />)}</div>
          ) : data && data.topCompetitors.length > 0 ? (
            <div className="space-y-2.5">
              {data.topCompetitors.map(({ name, count }) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 capitalize w-16 flex-shrink-0">{name}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400 rounded-full"
                      style={{ width: `${Math.round((count / totalThemes) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{count}×</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center pt-8">Aucune donnée</p>
          )}
        </div>

        {/* Score par thème */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-0.5">Score GEO par thème</h3>
          <p className="text-xs text-slate-400 mb-3">% de moteurs qui citent PayFit</p>
          {loading ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">Chargement…</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scoreData} layout="vertical">
                <XAxis type="number" domain={[0,100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} width={90} />
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  formatter={(v: number | undefined) => [`${v ?? 0}%`, "Score GEO"]}
                />
                <Bar dataKey="score" radius={[0,6,6,0]}>
                  {scoreData.map((e) => (
                    <Cell key={e.label} fill={e.score >= 75 ? "#10B981" : e.score >= 40 ? "#3B82F6" : "#F59E0B"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Per-engine detail ── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2].map((i) => <div key={i} className="h-64 bg-white rounded-2xl border border-slate-100 animate-pulse" />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.engines.map((engine) => {
            const meta = ENGINE_META[engine.engine] ?? { logo: "🤖", color: "#64748b" };
            return (
              <div key={engine.engine} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                {/* Engine header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{meta.logo}</span>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{engine.engine}</h3>
                      <p className="text-xs text-slate-400">
                        {engine.visibility}% visibilité · {engine.avgRank != null ? `rang #${engine.avgRank} moyen` : "non cité"}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-lg font-bold tabular-nums"
                    style={{ color: meta.color }}
                  >
                    {engine.visibility}%
                  </span>
                </div>

                {/* Visibility bar */}
                <div className="mb-4">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${engine.visibility}%`, backgroundColor: meta.color }} />
                  </div>
                </div>

                {/* Per-theme results */}
                <div className="space-y-2.5 mb-4">
                  {engine.themes.map((t) => (
                    <div key={t.theme} className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl">
                      {t.mentioned
                        ? <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        : <XCircle     size={13} className="text-slate-300 flex-shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-slate-700">{t.label}</span>
                          {t.rank && (
                            <span className="text-xs text-slate-400">rang #{t.rank}</span>
                          )}
                        </div>
                        {t.snippet ? (
                          <p className="text-xs text-slate-500 italic leading-relaxed">
                            <Highlight text={t.snippet} />
                          </p>
                        ) : (
                          <p className="text-xs text-slate-300">Non mentionné</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Full response collapsible */}
                <details className="group">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 transition-colors select-none list-none flex items-center gap-1">
                    <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                    Réponse complète
                  </summary>
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                    <Highlight text={engine.fullResponse} />
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      ) : null}

    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Globe, Brain, Eye, TrendingUp, RefreshCw, AlertCircle, Search,
  CheckCircle2, Clock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import type { GeoApiResponse } from "../../api/geo-data/route";
import DustAgentPanel from "../../components/DustAgentPanel";
import type { ThemeQueryResult } from "../../api/geo-theme/route";

// ─── Constants ────────────────────────────────────────────────────────────────

const ENGINE_META: Record<string, { logo: string; color: string }> = {
  "ChatGPT":      { logo: "🤖", color: "#10B981" },
  "Llama (Groq)": { logo: "⚡", color: "#F59E0B" },
  "Mistral":      { logo: "🌊", color: "#8B5CF6" },
};

const SECTOR_AVG = 52;

const BRAND_COLORS: Record<string, string> = {
  payfit:    "#2563EB",
  silae:     "#EC4899",
  sage:      "#F97316",
  cegid:     "#A855F7",
  lucca:     "#10B981",
  factorial: "#EF4444",
  nibelis:   "#06B6D4",
  eurecia:   "#84CC16",
  kelio:     "#F59E0B",
  adp:       "#DC2626",
  combo:     "#8B5CF6",
  workday:   "#0EA5E9",
  bamboohr:  "#22C55E",
};

const SHORT_LABELS: Record<string, string> = {
  "Logiciel de paie PME":  "Paie PME",
  "SIRH 50-200 salariés":  "SIRH",
  "Automatisation paie":   "Auto. paie",
  "Outils RH PME":         "RH PME",
  "Congés & absences":     "Congés",
  "Notes de frais":        "NDF",
  "Onboarding RH digital": "Onboarding",
  "Conformité DSN/paie":   "DSN/Paie",
};

function brandColor(name: string) {
  return BRAND_COLORS[name.toLowerCase()] ?? "#94A3B8";
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function HeatCell({ count, maxCount, color }: { count: number; maxCount: number; color: string }) {
  if (count === 0) {
    return (
      <div className="w-full h-9 rounded-lg bg-slate-50 flex items-center justify-center">
        <span className="text-slate-300 text-xs">—</span>
      </div>
    );
  }
  const ratio = count / maxCount;
  const alpha = Math.round((0.15 + ratio * 0.85) * 255).toString(16).padStart(2, "0");
  const textColor = ratio > 0.55 ? "#fff" : color;
  return (
    <div
      className="w-full h-9 rounded-lg flex items-center justify-center text-xs font-semibold"
      style={{ backgroundColor: `${color}${alpha}`, color: textColor }}
    >
      {count}/{maxCount}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GEOPositioningPage() {
  const [data, setData]           = useState<GeoApiResponse | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<number | null>(null);

  // Custom theme query
  const [customQuery,   setCustomQuery]   = useState("");
  const [customLoading, setCustomLoading] = useState(false);
  const [customResult,  setCustomResult]  = useState<ThemeQueryResult | null>(null);
  const [customError,   setCustomError]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runCustomQuery = useCallback(async (q: string) => {
    const query = q.trim();
    if (!query) return;
    setCustomLoading(true);
    setCustomError(null);
    setCustomResult(null);
    try {
      const res = await fetch(`/api/geo-theme?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setCustomResult(await res.json());
    } catch (e) {
      setCustomError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setCustomLoading(false);
    }
  }, []);

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

  const totalSlots = data
    ? data.engines[0].themes.length * data.engines.length
    : 0;

  const payfitCount = data
    ? data.engines.reduce((s, e) => s + e.themes.filter(t => t.mentioned).length, 0)
    : 0;

  // Part de voix : PayFit + top concurrents
  const sovData = data ? [
    { name: "PayFit", rawName: "payfit", pct: Math.round(payfitCount / totalSlots * 100), isPayfit: true },
    ...data.topCompetitors.slice(0, 6).map(c => ({
      name:    cap(c.name),
      rawName: c.name,
      pct:     Math.round(c.count / totalSlots * 100),
      isPayfit: false,
    })),
  ].sort((a, b) => b.pct - a.pct) : [];

  // Rang moyen : PayFit + top concurrents
  const compRankAccum: Record<string, number[]> = {};
  if (data) {
    for (const engine of data.engines)
      for (const theme of engine.themes)
        for (const cr of theme.competitorRanks)
          (compRankAccum[cr.name] ??= []).push(cr.rank);
  }
  const rankData = data ? [
    ...(data.globalAvgRank != null
      ? [{ name: "PayFit", rawName: "payfit", avgRank: data.globalAvgRank, isPayfit: true }]
      : []),
    ...data.topCompetitors.slice(0, 5).flatMap(c => {
      const ranks = compRankAccum[c.name] ?? [];
      if (!ranks.length) return [];
      const avg = Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length * 10) / 10;
      return [{ name: cap(c.name), rawName: c.name, avgRank: avg, isPayfit: false }];
    }),
  ].sort((a, b) => a.avgRank - b.avgRank) : [];

  // Heatmap concurrents × thèmes
  const topCompNames   = data?.topCompetitors.slice(0, 5).map(c => c.name) ?? [];
  const themeLabels    = data?.engines[0].themes.map(t => t.label) ?? [];
  const maxEngines     = data?.engines.length ?? 1;

  const heatRows = data ? [
    {
      name: "PayFit", rawName: "payfit", isPayfit: true,
      counts: themeLabels.map((_, i) => data.engines.filter(e => e.themes[i].mentioned).length),
    },
    ...topCompNames.map(comp => ({
      name: cap(comp), rawName: comp, isPayfit: false,
      counts: themeLabels.map((_, i) =>
        data.engines.filter(e => e.themes[i].competitors.includes(comp)).length
      ),
    })),
  ] : [];

  // Visibility per engine (existing chart)
  const visData = data
    ? data.engines.map(e => ({ name: e.engine, payfit: e.visibility, color: ENGINE_META[e.engine]?.color ?? "#64748b" }))
    : [];

  // ── Derived: theme focus ──────────────────────────────────────────────────
  const themeNames = data?.engines[0].themes.map(t => t.label) ?? [];

  type ConsoRow = { rawName: string; displayName: string; isPayfit: boolean; ranks: (number | null)[]; avgRank: number | null };
  const consolidatedRanking: ConsoRow[] = (() => {
    if (!data || selectedTheme === null) return [];
    const rows = new Map<string, (number | null)[]>();
    data.engines.forEach((engine, eIdx) => {
      const theme = engine.themes[selectedTheme];
      // PayFit
      if (!rows.has("payfit")) rows.set("payfit", new Array(data.engines.length).fill(null));
      rows.get("payfit")![eIdx] = theme.rank;
      // Competitors
      theme.competitorRanks.forEach(({ name, rank }) => {
        if (!rows.has(name)) rows.set(name, new Array(data.engines.length).fill(null));
        rows.get(name)![eIdx] = rank;
      });
    });
    return Array.from(rows.entries())
      .map(([rawName, ranks]) => {
        const valid = ranks.filter((r): r is number => r !== null);
        const avgRank = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length * 10) / 10 : null;
        return { rawName, displayName: rawName === "payfit" ? "PayFit" : cap(rawName), isPayfit: rawName === "payfit", ranks, avgRank };
      })
      .sort((a, b) => {
        if (a.avgRank === null && b.avgRank === null) return 0;
        if (a.avgRank === null) return 1;
        if (b.avgRank === null) return -1;
        return a.avgRank - b.avgRank;
      });
  })();

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
          8 thèmes · {data ? data.engines.length : "3"} moteurs · 1 prompt/moteur · cache 24h
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Score GEO global",  value: loading ? "…" : data ? `${data.globalVisibility}%` : "—",                               icon: <Globe size={14} /> },
            { label: "Moteurs actifs",    value: loading ? "…" : data ? `${data.engines.length}` : "—",                                   icon: <Brain size={14} /> },
            { label: "Thèmes analysés",   value: loading ? "…" : data ? `${data.engines[0]?.themes.length ?? 0}` : "—",                   icon: <Eye size={14} /> },
            { label: "Rang moyen",        value: loading ? "…" : data?.globalAvgRank != null ? `#${data.globalAvgRank}` : "—",            icon: <TrendingUp size={14} /> },
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

      {/* ── Sélecteur de thème ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Eye size={13} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Zoom thématique</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {themeNames.map((label, i) => (
            <button
              key={label}
              onClick={() => setSelectedTheme(selectedTheme === i ? null : i)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border
                ${selectedTheme === i
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"}`}
            >
              {SHORT_LABELS[label] ?? label}
            </button>
          ))}
          {selectedTheme !== null && (
            <button
              onClick={() => setSelectedTheme(null)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
            >
              ✕ Effacer
            </button>
          )}
        </div>

        {/* Saisie libre */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400 mb-2">Ou analyser un thème personnalisé :</p>
          <form
            onSubmit={(e) => { e.preventDefault(); runCustomQuery(customQuery); }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={customQuery}
              onChange={e => setCustomQuery(e.target.value)}
              placeholder="ex: gestion des talents, ATS PME…"
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
            />
            <button
              type="submit"
              disabled={customLoading || !customQuery.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white
                hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {customLoading
                ? <RefreshCw size={12} className="animate-spin" />
                : <Search size={12} />}
              {customLoading ? "Analyse…" : "Analyser"}
            </button>
            {customResult && (
              <button
                type="button"
                onClick={() => { setCustomResult(null); setCustomQuery(""); setCustomError(null); }}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
              >
                ✕
              </button>
            )}
          </form>
          {customError && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={11} /> {customError}
            </p>
          )}
        </div>
      </div>

      {/* ── Panel thème sélectionné ── */}
      {selectedTheme !== null && data && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5 shadow-sm space-y-5">
          <div>
            <h3 className="font-bold text-blue-900 text-base mb-0.5">
              📊 {themeNames[selectedTheme]}
            </h3>
            <p className="text-xs text-blue-500">Classement détaillé par moteur IA pour ce thème</p>
          </div>

          {/* Réponses brutes par moteur pour ce thème */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.engines.map(engine => {
              const theme    = engine.themes[selectedTheme];
              const items    = theme.rawText ? theme.rawText.split(",").map(s => s.trim()) : [];
              const meta     = ENGINE_META[engine.engine] ?? { logo: "🤖", color: "#64748b" };
              return (
                <div key={engine.engine} className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span>{meta.logo}</span>
                    <span className="text-xs font-semibold text-slate-700">{engine.engine}</span>
                    {theme.rank
                      ? <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">PayFit #{theme.rank}</span>
                      : <span className="ml-auto text-xs text-slate-300 font-medium">Non cité</span>}
                  </div>
                  <ol className="space-y-1">
                    {items.length > 0 ? items.map((item, idx) => {
                      const isPayfit = item.toLowerCase().includes("payfit");
                      return (
                        <li key={idx} className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1
                          ${isPayfit ? "bg-blue-600 text-white font-bold" : "text-slate-600"}`}>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0
                            ${isPayfit ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"}`}>
                            {idx + 1}
                          </span>
                          {item}
                        </li>
                      );
                    }) : <li className="text-xs text-slate-400">—</li>}
                  </ol>
                </div>
              );
            })}
          </div>

          {/* Classement consolidé */}
          {consolidatedRanking.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Classement consolidé · tous moteurs</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-slate-400 font-medium py-1 pr-3 w-28">Solution</th>
                    {data.engineNames.map(name => (
                      <th key={name} className="text-center text-slate-400 font-medium py-1 px-1 min-w-[80px]">
                        {ENGINE_META[name]?.logo ?? "🤖"} {name}
                      </th>
                    ))}
                    <th className="text-center text-slate-400 font-medium py-1 px-1 w-16">Moy.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {consolidatedRanking.map(row => (
                    <tr key={row.rawName} className={row.isPayfit ? "bg-blue-50 rounded-lg" : ""}>
                      <td className="py-1 pr-3 font-semibold whitespace-nowrap" style={{ color: brandColor(row.rawName) }}>
                        {row.isPayfit && "★ "}{row.displayName}
                      </td>
                      {row.ranks.map((rank, i) => (
                        <td key={i} className="py-1 px-1"><RankCell rank={rank} /></td>
                      ))}
                      <td className="py-1 px-1">
                        <div className={`w-full h-8 rounded-lg flex items-center justify-center text-xs font-bold
                          ${row.avgRank && row.avgRank <= 2 ? "bg-emerald-100 text-emerald-700" :
                            row.avgRank && row.avgRank <= 3 ? "bg-blue-100 text-blue-700" :
                            "bg-slate-50 text-slate-500"}`}>
                          {row.avgRank ? `#${row.avgRank}` : "—"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Panel thème custom ── */}
      {customResult && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100 p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-violet-900 text-base mb-0.5">
                🔍 {customResult.theme}
              </h3>
              <p className="text-xs text-violet-500">
                Résultats en temps réel · {new Date(customResult.timestamp).toLocaleTimeString("fr-FR")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {customResult.engines.map(engine => {
              const meta = ENGINE_META[engine.name] ?? { logo: "🤖", color: "#64748b" };
              return (
                <div key={engine.name} className="bg-white rounded-xl p-4 shadow-sm border border-violet-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span>{meta.logo}</span>
                    <span className="text-xs font-semibold text-slate-700">{engine.name}</span>
                    {engine.payfitRank
                      ? <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">PayFit #{engine.payfitRank}</span>
                      : <span className="ml-auto text-xs text-slate-300 font-medium">Non cité</span>}
                  </div>
                  <ol className="space-y-1">
                    {engine.items.length > 0 ? engine.items.map((item, idx) => {
                      const isPayfit = item.toLowerCase().includes("payfit");
                      return (
                        <li key={idx} className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1
                          ${isPayfit ? "bg-violet-600 text-white font-bold" : "text-slate-600"}`}>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0
                            ${isPayfit ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>
                            {idx + 1}
                          </span>
                          {item}
                        </li>
                      );
                    }) : <li className="text-xs text-slate-400">Aucun résultat</li>}
                  </ol>
                </div>
              );
            })}
          </div>

          {/* Mini classement consolidé */}
          {(() => {
            const rankMap = new Map<string, { displayName: string; isPayfit: boolean; ranks: (number|null)[] }>();
            customResult.engines.forEach((engine, eIdx) => {
              const set = (rawName: string, rank: number | null) => {
                if (!rankMap.has(rawName)) {
                  rankMap.set(rawName, {
                    displayName: rawName === "payfit" ? "PayFit" : cap(rawName),
                    isPayfit: rawName === "payfit",
                    ranks: new Array(customResult.engines.length).fill(null),
                  });
                }
                rankMap.get(rawName)!.ranks[eIdx] = rank;
              };
              set("payfit", engine.payfitRank);
              engine.competitors.forEach(c => set(c.name, c.rank));
            });
            const rows = Array.from(rankMap.entries())
              .map(([rawName, v]) => {
                const valid = v.ranks.filter((r): r is number => r !== null);
                const avg = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length * 10) / 10 : null;
                return { rawName, ...v, avgRank: avg };
              })
              .sort((a, b) => (a.avgRank ?? 99) - (b.avgRank ?? 99));
            if (rows.length === 0) return null;
            return (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-violet-100">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Classement consolidé</h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left text-slate-400 font-medium py-1 pr-3 w-28">Solution</th>
                      {customResult.engines.map(e => (
                        <th key={e.name} className="text-center text-slate-400 font-medium py-1 px-1 min-w-[80px]">
                          {ENGINE_META[e.name]?.logo ?? "🤖"} {e.name}
                        </th>
                      ))}
                      <th className="text-center text-slate-400 font-medium py-1 px-1 w-14">Moy.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map(row => (
                      <tr key={row.rawName} className={row.isPayfit ? "bg-violet-50" : ""}>
                        <td className="py-1 pr-3 font-semibold whitespace-nowrap" style={{ color: brandColor(row.rawName) }}>
                          {row.isPayfit && "★ "}{row.displayName}
                        </td>
                        {row.ranks.map((rank, i) => (
                          <td key={i} className="py-1 px-1"><RankCell rank={rank} /></td>
                        ))}
                        <td className="py-1 px-1">
                          <div className={`w-full h-8 rounded-lg flex items-center justify-center text-xs font-bold
                            ${row.avgRank && row.avgRank <= 2 ? "bg-emerald-100 text-emerald-700" :
                              row.avgRank && row.avgRank <= 3 ? "bg-blue-100 text-blue-700" :
                              "bg-slate-50 text-slate-500"}`}>
                            {row.avgRank ? `#${row.avgRank}` : "—"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Matrice PayFit ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 text-sm mb-0.5">Matrice de positionnement PayFit</h3>
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
                        <td key={i} className="py-1 px-1"><RankCell rank={rank} /></td>
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

        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-50">
          {[
            { label: "#1 — Leader",     cls: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300" },
            { label: "#2 — Bon",        cls: "bg-blue-100 text-blue-700" },
            { label: "#3 — Visible",    cls: "bg-blue-50 text-blue-600" },
            { label: "#4-5 — Marginal", cls: "bg-amber-50 text-amber-600" },
            { label: "— Non cité",      cls: "bg-slate-50 text-slate-300" },
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

      {/* ── Paysage concurrentiel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Part de voix */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-0.5">Part de voix globale</h3>
          <p className="text-xs text-slate-400 mb-3">
            % des slots IA où chaque marque est citée · {totalSlots} slots total ({maxEngines} moteurs × 8 thèmes)
          </p>
          {loading ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">Chargement…</div>
          ) : sovData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sovData} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" width={72}
                  tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  formatter={(v) => [`${v ?? 0}%`, "Présence"]}
                />
                <Bar dataKey="pct" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {sovData.map((e) => (
                    <Cell key={e.name} fill={brandColor(e.rawName)} opacity={e.isPayfit ? 1 : 0.72} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">Aucune donnée</div>
          )}
        </div>

        {/* Rang moyen comparé */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-0.5">Rang moyen comparé</h3>
          <p className="text-xs text-slate-400 mb-3">Position moyenne dans les listes IA · #1 = meilleur placement</p>
          {loading ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">Chargement…</div>
          ) : rankData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rankData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 5.5]} reversed tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? "" : `#${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  formatter={(v) => [`#${v ?? 0}`, "Rang moyen"]}
                />
                <Bar dataKey="avgRank" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {rankData.map((e) => (
                    <Cell key={e.name} fill={brandColor(e.rawName)} opacity={e.isPayfit ? 1 : 0.72} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">Aucune donnée</div>
          )}
        </div>
      </div>

      {/* ── Heatmap concurrents × thèmes ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 text-sm mb-0.5">Présence par thème</h3>
        <p className="text-xs text-slate-400 mb-4">
          Nombre de moteurs citant chaque marque · par thème · PayFit vs top concurrents
        </p>

        {loading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => (
            <div key={i} className="h-9 bg-slate-50 rounded-xl animate-pulse" />
          ))}</div>
        ) : heatRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-slate-400 font-medium py-1.5 pr-3 w-24">Marque</th>
                  {themeLabels.map(label => (
                    <th key={label} title={label}
                      className="text-center text-slate-400 font-medium py-1.5 px-1 min-w-[70px]">
                      {SHORT_LABELS[label] ?? label.split(" ")[0]}
                    </th>
                  ))}
                  <th className="text-center text-slate-400 font-medium py-1.5 px-1 w-16">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {heatRows.map(row => {
                  const total    = row.counts.reduce((a, b) => a + b, 0);
                  const maxTotal = themeLabels.length * maxEngines;
                  const color    = brandColor(row.rawName);
                  return (
                    <tr key={row.name} className={row.isPayfit ? "bg-blue-50/40" : ""}>
                      <td className="py-1.5 pr-3 font-semibold whitespace-nowrap" style={{ color }}>
                        {row.isPayfit && <span className="mr-1">★</span>}{row.name}
                      </td>
                      {row.counts.map((count, i) => (
                        <td key={i} className="py-1 px-1">
                          <HeatCell count={count} maxCount={maxEngines} color={color} />
                        </td>
                      ))}
                      <td className="py-1 px-1">
                        <div className="w-full h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ color, background: `${color}1A` }}>
                          {total}/{maxTotal}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">Aucune donnée</p>
        )}
      </div>

      {/* ── Visibilité par moteur ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 text-sm mb-0.5">Visibilité PayFit par moteur</h3>
        <p className="text-xs text-slate-400 mb-3">% de thèmes où PayFit apparaît · ligne = moy. secteur estimée</p>
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
                formatter={(v) => [`${v ?? 0}%`, "Visibilité"]}
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

      {/* ── Réponses brutes ── */}
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

      {/* ── Rapport GEO · Agent Dust ── */}
      <DustAgentPanel
        title="Rapport GEO Payfit"
        description="Génère un rapport GEO complet : marchés couverts, opportunités d'expansion, performances par région"
        icon="🌍"
        agentEndpoint="/api/dust-geo-report"
      />

    </div>
  );
}

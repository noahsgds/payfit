"use client";

import { useEffect, useState } from "react";
import {
  Search, Globe, MessageSquare, TrendingUp, ArrowRight, Brain,
  Users, BarChart2, AlertTriangle, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { PageId } from "../../components/Sidebar";
import { useSeoData } from "../../context/SeoDataContext";
import type { GeoApiResponse } from "../../api/geo-data/route";
import type { SocialDataResponse } from "../../api/social-data/route";
import type { SimulatorRow } from "../../api/simulator-data/route";
import type { SerpApiResponse } from "../../api/serp/route";

// ── Helpers ──────────────────────────────────────────────────────────────────

function visibilityScore(results: SerpApiResponse["results"]): number {
  if (!results.length) return 0;
  const sum = results.reduce((acc, r) => acc + (r.position ? 100 / r.position : 0), 0);
  return Math.round((sum / (results.length * 100)) * 100);
}

const ENGINE_COLORS: Record<string, string> = {
  "ChatGPT":      "#10B981",
  "Llama (Groq)": "#F59E0B",
  "Mistral":      "#8B5CF6",
};

const TYPE_COLORS: Record<string, string> = {
  Salaires: "#1B6EF3", Recrutement: "#8B5CF6", Transport: "#10B981",
  Avantages: "#F59E0B", Projection: "#EF4444", Épargne: "#EC4899", Autre: "#64748B",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { seoData, loading: trendsLoading } = useSeoData();

  const [geoData,     setGeoData]     = useState<GeoApiResponse | null>(null);
  const [geoLoading,  setGeoLoading]  = useState(true);
  const [socialData,  setSocialData]  = useState<SocialDataResponse | null>(null);
  const [socialLoad,  setSocialLoad]  = useState(true);
  const [simRows,     setSimRows]     = useState<SimulatorRow[]>([]);
  const [simLoading,  setSimLoading]  = useState(true);
  const [serpData,    setSerpData]    = useState<SerpApiResponse | null>(null);

  useEffect(() => {
    // SERP — localStorage (évite de consommer du quota API)
    try {
      const stored = localStorage.getItem("serpData_v1");
      if (stored) setSerpData(JSON.parse(stored) as SerpApiResponse);
    } catch { /* ignore */ }

    // GEO
    fetch("/api/geo-data")
      .then(r => r.ok ? r.json() : null)
      .then(d => setGeoData(d))
      .catch(() => {})
      .finally(() => setGeoLoading(false));

    // Social
    fetch("/api/social-data")
      .then(r => r.ok ? r.json() : null)
      .then(d => setSocialData(d))
      .catch(() => {})
      .finally(() => setSocialLoad(false));

    // Simulators
    fetch("/api/simulator-data")
      .then(r => r.ok ? r.json() : null)
      .then(d => setSimRows((d?.rows as SimulatorRow[]) ?? []))
      .catch(() => {})
      .finally(() => setSimLoading(false));
  }, []);

  // ── Dérivés SEO ──────────────────────────────────────────────────────────────
  const serpResults = serpData?.results ?? [];
  const seoScore    = visibilityScore(serpResults);
  const top3Count   = serpResults.filter(r => r.position && r.position <= 3).length;
  const top10Count  = serpResults.filter(r => r.position && r.position > 3 && r.position <= 10).length;

  // Courbe Google Trends — seulement "PayFit"
  const payfitSeries = seoData?.trends?.series?.["PayFit"] ?? [];
  const trendChartData = (seoData?.trends?.labels ?? []).map((label, i) => ({
    date: label,
    PayFit: payfitSeries[i] ?? 0,
  }));

  // ── Dérivés GEO ──────────────────────────────────────────────────────────────
  const geoScore   = geoData?.globalVisibility ?? null;
  const geoAvgRank = geoData?.globalAvgRank ?? null;
  const visData    = geoData
    ? geoData.engines.map(e => ({ name: e.engine, payfit: e.visibility }))
    : [];

  // ── Dérivés Social ───────────────────────────────────────────────────────────
  const totalMentions = socialData?.totalMentions ?? null;
  const positivePct   = socialData?.sentimentPct.positive ?? null;
  const sentimentPie  = socialData
    ? [
        { name: "Positif", value: socialData.sentimentPct.positive, color: "#10B981" },
        { name: "Neutre",  value: socialData.sentimentPct.neutral,  color: "#94A3B8" },
        { name: "Négatif", value: socialData.sentimentPct.negative, color: "#EF4444" },
      ]
    : [];

  // ── Dérivés Simulateurs ──────────────────────────────────────────────────────
  const totalSims = simRows.length;
  const leads     = simRows.filter(r => r.has_lead).length;
  const leadPct   = totalSims ? Math.round((leads / totalSims) * 100) : 0;

  const simTypeCounts: Record<string, number> = {};
  for (const r of simRows) simTypeCounts[r.type] = (simTypeCounts[r.type] ?? 0) + 1;
  const topSimTypes = Object.entries(simTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // ── Score global ─────────────────────────────────────────────────────────────
  const moduleScores = [
    { label: "SEO Organique",  score: serpResults.length > 0 ? seoScore       : 82, color: "#1B6EF3", page: "seo-positioning"  as PageId, live: serpResults.length > 0 },
    { label: "GEO / IA",       score: geoScore   ?? 68,                             color: "#3B82F6", page: "geo-positioning"   as PageId, live: geoScore !== null      },
    { label: "Social",         score: positivePct ?? 58,                            color: "#F59E0B", page: "social-listening"  as PageId, live: positivePct !== null   },
  ];
  const globalScore = Math.round(moduleScores.reduce((s, m) => s + m.score, 0) / moduleScores.length);

  // ── Opportunités (données issues de la page Competitive Analysis) ────────────
  const opportunities = [
    { type: "gap"    as const, title: "Mot-clé non capturé",  desc: "Factorial domine 'paie automatique ETI' (1 900 req/mois) — PayFit absent",          severity: "high"   as const },
    { type: "threat" as const, title: "Sage HR en hausse",    desc: "Sage HR a publié 12 nouvelles pages sur 'RH PME' ce trimestre",                      severity: "medium" as const },
    { type: "gap"    as const, title: "Opportunité GTA",       desc: "'Gestion des temps et activités' — 3 200 req/mois, concurrence faible",              severity: "high"   as const },
  ];

  // ── KPI tiles ────────────────────────────────────────────────────────────────
  const kpis = [
    {
      id: "seo-positioning" as PageId,
      label: "SEO Visibilité",
      value: serpResults.length > 0 ? `${seoScore}%` : "—",
      sub: serpResults.length > 0 ? `${top3Count} top 3 · ${top10Count} top 10` : "Lancer l'analyse SERP",
      icon: <Search size={15} />,
      color: "#1B6EF3",
      loading: false,
    },
    {
      id: "geo-positioning" as PageId,
      label: "Score GEO IA",
      value: geoLoading ? "…" : geoScore !== null ? `${geoScore}%` : "—",
      sub: geoLoading ? "" : geoAvgRank ? `Rang moyen #${geoAvgRank}` : "3 moteurs IA",
      icon: <Brain size={15} />,
      color: "#3B82F6",
      loading: geoLoading,
    },
    {
      id: "social-listening" as PageId,
      label: "Mentions sociales",
      value: socialLoad ? "…" : totalMentions !== null ? totalMentions.toLocaleString() : "—",
      sub: socialLoad ? "" : positivePct !== null ? `${positivePct}% positif` : "",
      icon: <MessageSquare size={15} />,
      color: "#F59E0B",
      loading: socialLoad,
    },
    {
      id: "simulator-stats" as PageId,
      label: "Simulations",
      value: simLoading ? "…" : totalSims.toLocaleString(),
      sub: simLoading ? "" : `${leads} leads (${leadPct}%)`,
      icon: <Users size={15} />,
      color: "#10B981",
      loading: simLoading,
    },
    {
      id: "seo-positioning" as PageId,
      label: "Position marché",
      value: "#1",
      sub: "+20% vs Sage HR",
      icon: <BarChart2 size={15} />,
      color: "#8B5CF6",
      loading: false,
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 fade-in">

      {/* ── Hero ── */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0F1629 0%, #1a2744 100%)" }}
      >
        <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="150" cy="50" r="80" fill="#1B6EF3" />
            <circle cx="50" cy="150" r="60" fill="#3B82F6" />
          </svg>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-[#1B6EF3] rounded-full animate-pulse-dot inline-block" />
            <span className="text-xs text-[#1B6EF3] font-semibold uppercase tracking-wider">
              Score global PayFit · {globalScore}/100
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-1">Vue d&apos;ensemble PayFit</h2>
          <p className="text-slate-400 text-sm max-w-lg">
            Toutes vos métriques clés en un coup d&apos;œil — SEO, GEO IA, Social &amp; Simulateurs.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => onNavigate("seo-positioning")}
              className="flex items-center gap-2 bg-[#1B6EF3] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1549C7] transition-colors"
            >
              <Search size={14} /> SEO Positions
            </button>
            <button
              onClick={() => onNavigate("geo-positioning")}
              className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
            >
              <Brain size={14} /> Visibilité IA
            </button>
            <button
              onClick={() => onNavigate("simulator-stats")}
              className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
            >
              Simulateurs <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI tiles ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map((stat, i) => (
          <button
            key={i}
            onClick={() => onNavigate(stat.id)}
            className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all text-left group hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
              >
                {stat.icon}
              </div>
              <ArrowRight size={12} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
            <p className="text-xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5 leading-tight">{stat.label}</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-tight">{stat.sub}</p>
          </button>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Google Trends — intérêt "PayFit" */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Google Trends — PayFit</h3>
              <p className="text-xs text-slate-400">Intérêt de recherche · 90 jours · FR</p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg font-medium">Live</span>
          </div>
          {trendsLoading ? (
            <div className="h-[155px] flex items-center justify-center">
              <RefreshCw size={16} className="animate-spin text-slate-200" />
            </div>
          ) : trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={155}>
              <AreaChart data={trendChartData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPayfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1B6EF3" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1B6EF3" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  interval={Math.floor(trendChartData.length / 6)} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                  formatter={(v: number | undefined) => [`${v ?? 0}/100`, "Intérêt"]} />
                <Area type="monotone" dataKey="PayFit" stroke="#1B6EF3" strokeWidth={2} fill="url(#gPayfit)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[155px] flex items-center justify-center text-xs text-slate-400">Aucune donnée</div>
          )}
          <button onClick={() => onNavigate("seo-positioning")}
            className="mt-3 text-xs text-[#1B6EF3] hover:underline flex items-center gap-1">
            Analyse SEO complète <ArrowRight size={11} />
          </button>
        </div>

        {/* GEO — visibilité par moteur IA */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="mb-1">
            <h3 className="font-semibold text-slate-900 text-sm">Visibilité IA par moteur</h3>
            <p className="text-xs text-slate-400">% thèmes où PayFit est cité · cache 24h</p>
          </div>
          {geoLoading ? (
            <div className="h-[155px] flex items-center justify-center">
              <RefreshCw size={16} className="animate-spin text-slate-200" />
            </div>
          ) : visData.length > 0 ? (
            <ResponsiveContainer width="100%" height={155}>
              <BarChart data={visData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                  formatter={(v) => [`${v ?? 0}%`, "Visibilité PayFit"]} />
                <Bar dataKey="payfit" radius={[6, 6, 0, 0]} maxBarSize={52}>
                  {visData.map((e) => (
                    <Cell key={e.name} fill={ENGINE_COLORS[e.name] ?? "#64748b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[155px] flex items-center justify-center text-xs text-slate-400">Aucune donnée — GEO en cache</div>
          )}
          <button onClick={() => onNavigate("geo-positioning")}
            className="mt-3 text-xs text-[#1B6EF3] hover:underline flex items-center gap-1">
            Voir le détail GEO <ArrowRight size={11} />
          </button>
        </div>

        {/* Social — sentiment */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="mb-1">
            <h3 className="font-semibold text-slate-900 text-sm">Sentiment social</h3>
            <p className="text-xs text-slate-400">Reddit · Twitter/X · LinkedIn</p>
          </div>
          {socialLoad ? (
            <div className="h-[155px] flex items-center justify-center">
              <RefreshCw size={16} className="animate-spin text-slate-200" />
            </div>
          ) : sentimentPie.length > 0 ? (
            <div className="flex items-center gap-3 mt-3">
              <PieChart width={110} height={110}>
                <Pie data={sentimentPie} cx={55} cy={55} innerRadius={34} outerRadius={52}
                  paddingAngle={2} dataKey="value">
                  {sentimentPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
              <div className="space-y-2 flex-1">
                {sentimentPie.map(s => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-slate-600 flex-1">{s.name}</span>
                    <span className="text-xs font-bold text-slate-800">{s.value}%</span>
                  </div>
                ))}
                <p className="text-xs text-slate-400 pt-1 border-t border-slate-50">
                  {totalMentions?.toLocaleString()} mentions au total
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[155px] flex items-center justify-center text-xs text-slate-400">Aucune donnée</div>
          )}
          <button onClick={() => onNavigate("social-listening")}
            className="mt-3 text-xs text-[#1B6EF3] hover:underline flex items-center gap-1">
            Social Listening complet <ArrowRight size={11} />
          </button>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Module scores */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Scores modules</h3>
          <div className="space-y-3">
            {moduleScores.map((item) => (
              <button key={item.label} onClick={() => onNavigate(item.page)} className="w-full text-left group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                    {item.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {item.live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />}
                    <span className="text-xs font-bold" style={{ color: item.color }}>{item.score}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${item.score}%`, backgroundColor: item.color }} />
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 p-3 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 text-center">Score global PayFit</p>
            <p className="text-2xl font-bold text-slate-900 text-center mt-1">
              {globalScore}<span className="text-sm font-normal text-slate-400">/100</span>
            </p>
          </div>
        </div>

        {/* Simulateurs mini */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Simulateurs — Profils ICP</h3>
            <button onClick={() => onNavigate("simulator-stats")}
              className="text-xs text-[#1B6EF3] hover:underline flex items-center gap-1">
              Détails <ArrowRight size={11} />
            </button>
          </div>
          {simLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-7 bg-slate-50 rounded-xl animate-pulse" />)}
            </div>
          ) : totalSims === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Aucune donnée simulateur</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-500 font-medium">Simulations</p>
                  <p className="text-xl font-bold text-blue-700">{totalSims.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-xs text-emerald-500 font-medium">Leads</p>
                  <p className="text-xl font-bold text-emerald-700">
                    {leads} <span className="text-sm font-normal text-emerald-500">({leadPct}%)</span>
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                {topSimTypes.map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: TYPE_COLORS[type] ?? "#94a3b8" }} />
                    <span className="text-xs text-slate-600 flex-1 truncate">{type}</span>
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${Math.round(count / totalSims * 100)}%`, backgroundColor: TYPE_COLORS[type] ?? "#94a3b8" }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Opportunités & menaces (Competitive Analysis) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Opportunités &amp; Menaces</h3>
          <div className="space-y-2.5">
            {opportunities.map((opp, i) => (
              <div key={i} className={`flex gap-2.5 p-3 rounded-xl ${opp.type === "gap" ? "bg-emerald-50" : "bg-amber-50"}`}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  opp.type === "gap" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                }`}>
                  {opp.type === "gap" ? <TrendingUp size={12} /> : <AlertTriangle size={12} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-xs font-bold text-slate-800 truncate">{opp.title}</p>
                    <span className={`text-[10px] px-1 py-0.5 rounded font-semibold flex-shrink-0 ${
                      opp.severity === "high" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                    }`}>
                      {opp.severity === "high" ? "Haute" : "Moy."}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">{opp.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

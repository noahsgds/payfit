"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, TrendingUp, TrendingDown, Heart, ThumbsUp,
  Filter, AlertCircle, RefreshCw, ExternalLink, MessageCircle, Repeat2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import MetricCard from "../../components/MetricCard";
import type { SocialDataResponse, SocialPost, Platform } from "../../api/social-data/route";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_CFG: Record<Platform, { label: string; icon: string; color: string; bg: string; textColor: string }> = {
  reddit:   { label: "Reddit",    icon: "🟠", color: "#FF4500", bg: "bg-orange-50",  textColor: "text-orange-700" },
  twitter:  { label: "Twitter/X", icon: "🐦", color: "#1D9BF0", bg: "bg-sky-50",     textColor: "text-sky-700"    },
  linkedin: { label: "LinkedIn",  icon: "💼", color: "#0A66C2", bg: "bg-blue-50",    textColor: "text-blue-700"   },
};

const SENTIMENT_CFG = {
  positive: { label: "Positif",  bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  neutral:  { label: "Neutre",   bg: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-200"   },
  negative: { label: "Négatif",  bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200"     },
};

const PLATFORMS: Array<{ id: Platform | "all"; label: string; icon: string }> = [
  { id: "all",      label: "Toutes",    icon: "🌐" },
  { id: "reddit",   label: "Reddit",    icon: "🟠" },
  { id: "twitter",  label: "Twitter/X", icon: "🐦" },
  { id: "linkedin", label: "LinkedIn",  icon: "💼" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `Il y a ${d}j`;
  if (h > 0) return `Il y a ${h}h`;
  return "Récent";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SocialListeningPage() {
  const [data,      setData]      = useState<SocialDataResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [platform,  setPlatform]  = useState<Platform | "all">("all");
  const [sentiment, setSentiment] = useState<string | null>(null);

  const load = useCallback(async (bust = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = bust ? `/api/social-data?bust=${Date.now()}` : "/api/social-data";
      const res = await fetch(url);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filters ────────────────────────────────────────────────────────────────
  const filtered: SocialPost[] = (data?.posts ?? []).filter(p =>
    (platform === "all" || p.platform === platform) &&
    (!sentiment || p.sentiment === sentiment),
  );

  // ── Sentiment pie ──────────────────────────────────────────────────────────
  const activeSentiment = platform === "all"
    ? data?.sentimentPct
    : data?.byPlatform[platform]?.sentimentPct;

  const sentimentPie = activeSentiment
    ? [
        { name: "Positif",  value: activeSentiment.positive, color: "#10B981" },
        { name: "Neutre",   value: activeSentiment.neutral,  color: "#94A3B8" },
        { name: "Négatif",  value: activeSentiment.negative, color: "#EF4444" },
      ]
    : [];

  // ── Top sources ────────────────────────────────────────────────────────────
  const topSources = platform === "all"
    ? (() => {
        const map = new Map<string, number>();
        (data?.posts ?? []).forEach(p => map.set(p.source, (map.get(p.source) ?? 0) + 1));
        return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count).slice(0, 6);
      })()
    : (data?.byPlatform[platform]?.topSources ?? []);

  const negativePosts = filtered.filter(p => p.sentiment === "negative").length;

  return (
    <div className="p-6 space-y-6 fade-in">

      {/* ── Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Mentions totales"
          value={loading ? "…" : (data?.totalMentions ?? 0)}
          icon={<MessageSquare size={16} />}
          color="#1B6EF3"
        />
        <MetricCard
          title="Sentiment positif"
          value={loading ? "…" : `${data?.sentimentPct.positive ?? 0}%`}
          icon={<ThumbsUp size={16} />}
          color="#10B981"
        />
        <MetricCard
          title="Reddit"
          value={loading ? "…" : (data?.byPlatform.reddit.count ?? 0)}
          icon={<span className="text-sm">🟠</span>}
          color="#FF4500"
        />
        <MetricCard
          title="Twitter + LinkedIn"
          value={loading ? "…" : ((data?.byPlatform.twitter.count ?? 0) + (data?.byPlatform.linkedin.count ?? 0))}
          icon={<span className="text-sm">🐦</span>}
          color="#1D9BF0"
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Stacked bar — mentions par jour × plateforme */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Mentions par jour · toutes plateformes</h3>
              <p className="text-xs text-slate-400">7 derniers jours</p>
            </div>
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-slate-200
                text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="h-[220px] flex items-center justify-center">
              <RefreshCw size={24} className="animate-spin text-slate-200" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.dailyCounts ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="reddit"   name="Reddit"    stackId="a" fill="#FF4500" radius={[0, 0, 0, 0]} />
                <Bar dataKey="twitter"  name="Twitter/X" stackId="a" fill="#1D9BF0" radius={[0, 0, 0, 0]} />
                <Bar dataKey="linkedin" name="LinkedIn"  stackId="a" fill="#0A66C2" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sentiment + Top sources */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">
              Sentiment · {platform === "all" ? "global" : PLATFORM_CFG[platform].label}
            </h3>
            {loading ? (
              <div className="h-[100px] flex items-center justify-center">
                <RefreshCw size={16} className="animate-spin text-slate-200" />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <PieChart width={100} height={100}>
                  <Pie data={sentimentPie} cx={50} cy={50} innerRadius={30} outerRadius={48} paddingAngle={2} dataKey="value">
                    {sentimentPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
                <div className="space-y-1.5">
                  {sentimentPie.map(s => (
                    <div key={s.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-xs text-slate-600">{s.name}</span>
                      <span className="text-xs font-bold text-slate-800 ml-auto">{s.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Top sources</h3>
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-6 rounded bg-slate-100 animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {topSources.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2 py-1 border-b border-slate-50 last:border-0">
                    <span className="text-[10px] font-bold text-slate-400 w-4">{i + 1}</span>
                    <span className="text-xs font-medium text-slate-700 flex-1 truncate">{s.name}</span>
                    <span className="text-xs font-bold text-slate-500">{s.count}</span>
                    {i === 0
                      ? <TrendingUp size={10} className="text-emerald-500" />
                      : <TrendingDown size={10} className="text-slate-300" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Platform breakdown pills ── */}
      {!loading && data && (
        <div className="grid grid-cols-3 gap-3">
          {(["reddit", "twitter", "linkedin"] as Platform[]).map(p => {
            const cfg = PLATFORM_CFG[p];
            const stats = data.byPlatform[p];
            return (
              <button
                key={p}
                onClick={() => setPlatform(platform === p ? "all" : p)}
                className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md ${
                  platform === p
                    ? `${cfg.bg} border-current ring-2`
                    : "bg-white border-slate-100 shadow-sm"
                }`}
                style={platform === p ? { color: cfg.color } : {}}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{cfg.icon}</span>
                  <span className="text-xs font-semibold text-slate-800">{cfg.label}</span>
                  <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    data.platformSource[p] === "live"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-amber-100 text-amber-600"
                  }`}>
                    {data.platformSource[p] === "live" ? "live" : "demo"}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats.count}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {stats.sentimentPct.positive}% positif · {stats.sentimentPct.negative}% négatif
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                platform === p.id ? "bg-[#1B6EF3] text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{p.icon}</span> {p.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {([null, "positive", "neutral", "negative"] as const).map(s => (
            <button
              key={String(s)}
              onClick={() => setSentiment(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sentiment === s ? "bg-[#1B6EF3] text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s === null ? "Tous" : SENTIMENT_CFG[s].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
          <Filter size={12} />
          {filtered.length} mention{filtered.length > 1 ? "s" : ""}
        </div>

        {data && (
          <span className="text-xs text-slate-400 ml-auto">
            Actualisé à {new Date(data.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            {data.cached && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">cache</span>}
          </span>
        )}
      </div>

      {/* ── Feed ── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3" />
              <div className="h-12 bg-slate-100 rounded" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
          <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600 font-medium">Impossible de charger les données</p>
          <p className="text-xs text-red-400 mt-1">{error}</p>
          <button onClick={() => load(true)} className="mt-3 text-xs px-4 py-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
            Réessayer
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <MessageSquare size={24} className="text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Aucune mention pour ce filtre</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(post => {
            const sc   = SENTIMENT_CFG[post.sentiment];
            const pc   = PLATFORM_CFG[post.platform];
            const isLI = post.platform === "linkedin";

            return (
              <div key={post.id} className={`bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-shadow ${sc.border}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{pc.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{post.source}</p>
                      <p className="text-xs text-slate-400">{post.author} · {timeAgo(post.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    {post.permalink && (
                      <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-slate-500">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Title (Reddit) */}
                {post.title && (
                  <p className="text-xs font-semibold text-slate-800 mb-1 leading-snug">{post.title}</p>
                )}

                {/* Content */}
                <p className={`text-xs text-slate-600 leading-relaxed mb-3 ${isLI ? "line-clamp-3" : "line-clamp-2"}`}>
                  {post.content}
                </p>

                {/* Engagement */}
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Heart size={11} /> {post.score}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle size={11} /> {post.numComments}
                  </div>
                  {post.platform === "twitter" && (
                    <div className="flex items-center gap-1">
                      <Repeat2 size={11} /> {Math.floor(post.score * 0.3)}
                    </div>
                  )}
                  <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${pc.bg} ${pc.textColor}`}>
                    {pc.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

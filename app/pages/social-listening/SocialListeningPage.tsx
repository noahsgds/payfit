"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Heart,
  ThumbsUp,
  Filter,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import MetricCard from "../../components/MetricCard";
import type { SocialRedditResponse, RedditPost } from "../../api/social-reddit/route";

// ─── Sentiment config ─────────────────────────────────────────────────────────

const sentimentConfig = {
  positive: { label: "Positif",  bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "#10B981" },
  neutral:  { label: "Neutre",   bg: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-200",  dot: "#94A3B8" },
  negative: { label: "Négatif",  bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",    dot: "#EF4444" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SocialListeningPage() {
  const [data,        setData]        = useState<SocialRedditResponse | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [sentiment,   setSentiment]   = useState<string | null>(null);

  const load = useCallback(async (bust = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = bust ? `/api/social-reddit?bust=${Date.now()}` : "/api/social-reddit";
      const res = await fetch(url);
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

  useEffect(() => { load(); }, [load]);

  // ── Filtered posts ──────────────────────────────────────────────────────────
  const filtered: RedditPost[] = (data?.posts ?? []).filter(p =>
    !sentiment || p.sentiment === sentiment,
  );

  // ── Sentiment pie data ──────────────────────────────────────────────────────
  const sentimentPieData = data
    ? [
        { name: "Positif",  value: data.sentimentPct.positive, color: "#10B981" },
        { name: "Neutre",   value: data.sentimentPct.neutral,  color: "#94A3B8" },
        { name: "Négatif",  value: data.sentimentPct.negative, color: "#EF4444" },
      ]
    : [];

  const negativePosts = (data?.posts ?? []).filter(p => p.sentiment === "negative").length;

  return (
    <div className="p-6 space-y-6 fade-in">

      {/* ── Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Mentions Reddit"
          value={loading ? "…" : (data?.totalMentions ?? 0)}
          icon={<MessageSquare size={16} />}
          color="#FF4500"
        />
        <MetricCard
          title="Sentiment positif"
          value={loading ? "…" : `${data?.sentimentPct.positive ?? 0}%`}
          icon={<ThumbsUp size={16} />}
          color="#10B981"
        />
        <MetricCard
          title="Top subreddit"
          value={loading ? "…" : (data?.topSubreddits[0]?.name ?? "—")}
          icon={<TrendingUp size={16} />}
          color="#1B6EF3"
        />
        <MetricCard
          title="Mentions négatives"
          value={loading ? "…" : negativePosts}
          icon={<AlertCircle size={16} />}
          color="#EF4444"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Daily bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Mentions Reddit par jour</h3>
              <p className="text-xs text-slate-400">7 derniers jours · données en temps réel</p>
            </div>
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500
                hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              {data?.cached ? "Cache" : "Live"}
            </button>
          </div>

          {loading ? (
            <div className="h-[220px] flex items-center justify-center">
              <RefreshCw size={24} className="animate-spin text-slate-300" />
            </div>
          ) : error ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-red-500 gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.dailyCounts ?? []}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF4500" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#FF4500" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  formatter={(v: number | undefined) => [`${v ?? 0} posts`, "Reddit"]}
                />
                <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} name="Posts" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sentiment + Top subreddits */}
        <div className="space-y-3">

          {/* Sentiment donut */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Analyse de sentiment</h3>
            {loading ? (
              <div className="h-[100px] flex items-center justify-center">
                <RefreshCw size={16} className="animate-spin text-slate-300" />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <PieChart width={100} height={100}>
                  <Pie data={sentimentPieData} cx={50} cy={50} innerRadius={30} outerRadius={48} paddingAngle={2} dataKey="value">
                    {sentimentPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
                <div className="space-y-1.5">
                  {sentimentPieData.map(s => (
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

          {/* Top subreddits */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Top subreddits</h3>
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-6 rounded bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(data?.topSubreddits ?? []).map(s => (
                  <div key={s.name} className="flex items-center gap-2 py-1 border-b border-slate-50 last:border-0">
                    <span className="text-xs font-medium text-slate-700 flex-1">{s.name}</span>
                    <span className="text-xs font-bold text-[#FF4500]">{s.count}</span>
                    {s.count > (data?.topSubreddits[0]?.count ?? 1) * 0.5
                      ? <TrendingUp size={10} className="text-emerald-500" />
                      : <TrendingDown size={10} className="text-slate-300" />}
                  </div>
                ))}
                {(data?.topSubreddits.length ?? 0) === 0 && (
                  <p className="text-xs text-slate-400">Aucun subreddit</p>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Platform (Reddit only for now) */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FF4500] text-white">
            🟠 Reddit
          </div>
          {["Twitter/X", "LinkedIn"].map(p => (
            <div key={p} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 cursor-not-allowed" title="Bientôt disponible">
              {p === "Twitter/X" ? "🐦" : "💼"} {p}
            </div>
          ))}
        </div>

        {/* Sentiment filter */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {([null, "positive", "neutral", "negative"] as const).map(s => (
            <button
              key={String(s)}
              onClick={() => setSentiment(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sentiment === s ? "bg-[#1B6EF3] text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s === null ? "Tous" : sentimentConfig[s].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
          <Filter size={12} />
          {filtered.length} mention{filtered.length > 1 ? "s" : ""}
        </div>

        {data && (
          <span className="text-xs text-slate-400 ml-auto flex items-center gap-1.5">
            Mis à jour {new Date(data.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            {data.cached
              ? <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">cache</span>
              : data.source === "mock"
                ? <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">demo</span>
                : <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">live</span>
            }
          </span>
        )}
      </div>

      {/* ── Mentions feed ── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
              <div className="h-4 bg-slate-100 rounded animate-pulse w-1/3" />
              <div className="h-12 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
          <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600 font-medium">Impossible de charger les données Reddit</p>
          <p className="text-xs text-red-400 mt-1">{error}</p>
          <button
            onClick={() => load(true)}
            className="mt-3 text-xs px-4 py-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          >
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
            const sc = sentimentConfig[post.sentiment];
            const timeAgo = (() => {
              const diff = Date.now() - new Date(post.createdAt).getTime();
              const h = Math.floor(diff / 3_600_000);
              const d = Math.floor(h / 24);
              if (d > 0) return `Il y a ${d}j`;
              if (h > 0) return `Il y a ${h}h`;
              return "Récent";
            })();

            return (
              <div
                key={post.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-shadow ${sc.border}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🟠</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{post.subreddit}</p>
                      <p className="text-xs text-slate-400">{post.author} · {timeAgo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                      {sc.label}
                    </span>
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {/* Title */}
                <p className="text-xs font-semibold text-slate-800 mb-1 leading-snug">{post.title}</p>

                {/* Content preview */}
                {post.content && post.content !== post.title && (
                  <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">
                    {post.content}
                  </p>
                )}

                {/* Engagement */}
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                  <div className="flex items-center gap-1">
                    <Heart size={11} />
                    {post.score}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle size={11} />
                    {post.numComments}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

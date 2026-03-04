"use client";

import { useState } from "react";
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Heart,
  Repeat2,
  ThumbsUp,
  Filter,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
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

const platforms = [
  { id: "all", label: "Toutes", icon: "🌐" },
  { id: "reddit", label: "Reddit", icon: "🟠" },
  { id: "twitter", label: "Twitter/X", icon: "🐦" },
  { id: "linkedin", label: "LinkedIn", icon: "💼" },
];

const mentionData = [
  { date: "25 Fév", reddit: 42, twitter: 118, linkedin: 67 },
  { date: "26 Fév", reddit: 38, twitter: 134, linkedin: 82 },
  { date: "27 Fév", reddit: 61, twitter: 97, linkedin: 71 },
  { date: "28 Fév", reddit: 89, twitter: 142, linkedin: 94 },
  { date: "01 Mar", reddit: 124, twitter: 198, linkedin: 118 },
  { date: "02 Mar", reddit: 98, twitter: 167, linkedin: 103 },
  { date: "03 Mar", reddit: 73, twitter: 129, linkedin: 88 },
];

const sentimentData = [
  { name: "Positif", value: 58, color: "#00B379" },
  { name: "Neutre", value: 28, color: "#94A3B8" },
  { name: "Négatif", value: 14, color: "#EF4444" },
];

const mentions = [
  {
    platform: "reddit",
    subreddit: "r/paie",
    user: "u/compta_martin",
    content:
      "Franchement PayFit c'est top pour notre PME de 45 salariés. L'automatisation des bulletins nous a sauvé la vie !",
    sentiment: "positive",
    engagement: { likes: 47, comments: 12, shares: 8 },
    time: "Il y a 2h",
    reach: "12.4k",
  },
  {
    platform: "twitter",
    handle: "@RHDigitalFrance",
    content:
      "Comparatif SIRH 2024 : #PayFit arrive en tête sur la facilité d'utilisation et la conformité légale 🏆 @PayFit #RH #Paie",
    sentiment: "positive",
    engagement: { likes: 89, comments: 23, shares: 41 },
    time: "Il y a 4h",
    reach: "8.7k",
  },
  {
    platform: "linkedin",
    handle: "Marie Dupont, DRH",
    content:
      "Après 3 ans sur PayFit, nous avons réduit de 60% le temps consacré à la paie. Un vrai game-changer pour les équipes RH.",
    sentiment: "positive",
    engagement: { likes: 234, comments: 45, shares: 67 },
    time: "Il y a 6h",
    reach: "34.2k",
  },
  {
    platform: "reddit",
    subreddit: "r/entrepreneur",
    user: "u/startup_ceo",
    content:
      "PayFit ou Silae pour une startup de 20 personnes ? Le pricing de PayFit me paraît un peu élevé pour notre stade...",
    sentiment: "neutral",
    engagement: { likes: 12, comments: 28, shares: 2 },
    time: "Il y a 8h",
    reach: "5.1k",
  },
  {
    platform: "twitter",
    handle: "@ConseilRH",
    content:
      "Le support client de @PayFit a mis 3 jours à répondre à notre ticket urgent sur un bug de DSN. Décevant pour un outil premium.",
    sentiment: "negative",
    engagement: { likes: 34, comments: 67, shares: 19 },
    time: "Il y a 11h",
    reach: "6.3k",
  },
  {
    platform: "linkedin",
    handle: "Thomas Leroy, CFO",
    content:
      "Migration vers PayFit en cours. L'import des données est plus complexe que prévu mais l'équipe support est réactive.",
    sentiment: "neutral",
    engagement: { likes: 45, comments: 12, shares: 8 },
    time: "Il y a 1j",
    reach: "9.8k",
  },
];

const platformIcons: Record<string, string> = {
  reddit: "🟠",
  twitter: "🐦",
  linkedin: "💼",
};

const sentimentConfig = {
  positive: {
    label: "Positif",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-100",
  },
  neutral: {
    label: "Neutre",
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-100",
  },
  negative: {
    label: "Négatif",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-100",
  },
};

const trendingTopics = [
  { topic: "#PayFit", mentions: 284, trend: 18 },
  { topic: "logiciel paie", mentions: 197, trend: 7 },
  { topic: "SIRH PME", mentions: 143, trend: -3 },
  { topic: "bulletin salaire", mentions: 118, trend: 24 },
  { topic: "congés payés", mentions: 94, trend: 11 },
];

export default function SocialListeningPage() {
  const [activePlatform, setActivePlatform] = useState("all");
  const [activeSentiment, setActiveSentiment] = useState<string | null>(null);

  const filtered = mentions.filter((m) => {
    const matchPlatform =
      activePlatform === "all" || m.platform === activePlatform;
    const matchSentiment =
      !activeSentiment || m.sentiment === activeSentiment;
    return matchPlatform && matchSentiment;
  });

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Mentions totales"
          value="1,284"
          change={22}
          changeLabel="cette semaine"
          icon={<MessageSquare size={16} />}
          color="#00B379"
        />
        <MetricCard
          title="Sentiment positif"
          value="58%"
          change={4}
          changeLabel="vs semaine dernière"
          icon={<ThumbsUp size={16} />}
          color="#3B82F6"
        />
        <MetricCard
          title="Portée estimée"
          value="2.4M"
          change={31}
          changeLabel="impressions"
          icon={<TrendingUp size={16} />}
          color="#8B5CF6"
        />
        <MetricCard
          title="Alertes critiques"
          value="2"
          change={-33}
          changeLabel="vs dernière sem."
          icon={<AlertCircle size={16} />}
          color="#EF4444"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mentions evolution */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Évolution des mentions
              </h3>
              <p className="text-xs text-slate-400">7 derniers jours</p>
            </div>
            <div className="flex gap-3">
              {[
                { key: "reddit", color: "#FF4500", label: "Reddit" },
                { key: "twitter", color: "#1DA1F2", label: "Twitter" },
                { key: "linkedin", color: "#0A66C2", label: "LinkedIn" },
              ].map((p) => (
                <div key={p.key} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-xs text-slate-500">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mentionData}>
              <defs>
                {[
                  { key: "reddit", color: "#FF4500" },
                  { key: "twitter", color: "#1DA1F2" },
                  { key: "linkedin", color: "#0A66C2" },
                ].map((p) => (
                  <linearGradient
                    key={p.key}
                    id={`grad-${p.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={p.color} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={p.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="reddit"
                stroke="#FF4500"
                fill="url(#grad-reddit)"
                strokeWidth={1.5}
                name="Reddit"
              />
              <Area
                type="monotone"
                dataKey="twitter"
                stroke="#1DA1F2"
                fill="url(#grad-twitter)"
                strokeWidth={1.5}
                name="Twitter"
              />
              <Area
                type="monotone"
                dataKey="linkedin"
                stroke="#0A66C2"
                fill="url(#grad-linkedin)"
                strokeWidth={1.5}
                name="LinkedIn"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment + Trending */}
        <div className="space-y-3">
          {/* Sentiment donut */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">
              Analyse de sentiment
            </h3>
            <div className="flex items-center gap-4">
              <PieChart width={100} height={100}>
                <Pie
                  data={sentimentData}
                  cx={50}
                  cy={50}
                  innerRadius={30}
                  outerRadius={48}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="space-y-1.5">
                {sentimentData.map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-xs text-slate-600">{s.name}</span>
                    <span className="text-xs font-bold text-slate-800 ml-auto">
                      {s.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trending */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">
              Sujets tendance
            </h3>
            <div className="space-y-2">
              {trendingTopics.map((t) => (
                <div
                  key={t.topic}
                  className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0"
                >
                  <span className="text-xs font-medium text-slate-700 flex-1">
                    {t.topic}
                  </span>
                  <span className="text-xs text-slate-500">{t.mentions}</span>
                  <div className="flex items-center gap-0.5">
                    {t.trend > 0 ? (
                      <TrendingUp size={10} className="text-emerald-500" />
                    ) : (
                      <TrendingDown size={10} className="text-red-500" />
                    )}
                    <span
                      className={`text-xs font-semibold ${
                        t.trend > 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {t.trend > 0 ? "+" : ""}
                      {t.trend}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePlatform(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePlatform === p.id
                  ? "bg-[#00B379] text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {[
            { id: null, label: "Tous" },
            { id: "positive", label: "Positif" },
            { id: "neutral", label: "Neutre" },
            { id: "negative", label: "Négatif" },
          ].map((s) => (
            <button
              key={String(s.id)}
              onClick={() => setActiveSentiment(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSentiment === s.id
                  ? "bg-[#00B379] text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
          <Filter size={12} />
          {filtered.length} mentions affichées
        </div>
      </div>

      {/* Mentions feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((mention, i) => {
          const sc =
            sentimentConfig[mention.sentiment as keyof typeof sentimentConfig];
          return (
            <div
              key={i}
              className={`bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-shadow ${sc.border}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {platformIcons[mention.platform]}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {"subreddit" in mention ? mention.subreddit : ""}
                      {"handle" in mention ? mention.handle : ""}
                    </p>
                    <p className="text-xs text-slate-400">
                      {"user" in mention ? mention.user : ""}
                      {mention.time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}
                  >
                    {sc.label}
                  </span>
                  <span className="text-xs text-slate-400">
                    {mention.reach}
                  </span>
                </div>
              </div>

              {/* Content */}
              <p className="text-sm text-slate-700 leading-relaxed mb-3">
                {mention.content}
              </p>

              {/* Engagement */}
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Heart size={11} />
                  {mention.engagement.likes}
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare size={11} />
                  {mention.engagement.comments}
                </div>
                <div className="flex items-center gap-1">
                  <Repeat2 size={11} />
                  {mention.engagement.shares}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

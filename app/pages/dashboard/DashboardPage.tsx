"use client";

import {
  Search,
  Globe,
  BarChart2,
  MessageSquare,
  Bot,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import MetricCard from "../../components/MetricCard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { PageId } from "../../components/Sidebar";

const trafficData = [
  { month: "Sep", trafic: 42000, objectif: 45000 },
  { month: "Oct", trafic: 48500, objectif: 48000 },
  { month: "Nov", trafic: 51200, objectif: 51000 },
  { month: "Déc", trafic: 47800, objectif: 53000 },
  { month: "Jan", trafic: 55600, objectif: 56000 },
  { month: "Fév", trafic: 61300, objectif: 59000 },
];

const quickStats = [
  {
    id: "dust-agents" as PageId,
    label: "Agents IA actifs",
    value: "3",
    icon: <Bot size={16} />,
    color: "#8B5CF6",
    sub: "Dust connectés",
  },
  {
    id: "seo-positioning" as PageId,
    label: "Mots-clés top 3",
    value: "847",
    icon: <Search size={16} />,
    color: "#1B6EF3",
    sub: "+12% ce mois",
  },
  {
    id: "geo-positioning" as PageId,
    label: "Visibilité GEO",
    value: "68%",
    icon: <Globe size={16} />,
    color: "#3B82F6",
    sub: "ChatGPT, Perplexity",
  },
  {
    id: "social-listening" as PageId,
    label: "Mentions sociales",
    value: "1,284",
    icon: <MessageSquare size={16} />,
    color: "#F59E0B",
    sub: "7 derniers jours",
  },
];

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Welcome */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F1629 0%, #1a2744 100%)",
        }}
      >
        <div className="absolute right-0 top-0 w-64 h-full opacity-10">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="150" cy="50" r="80" fill="#1B6EF3" />
            <circle cx="50" cy="150" r="60" fill="#3B82F6" />
          </svg>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-[#1B6EF3] rounded-full animate-pulse-dot inline-block" />
            <span className="text-xs text-[#1B6EF3] font-semibold uppercase tracking-wider">
              Plateforme SEO Intelligence
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-1">
            Bonjour, Équipe SEO 👋
          </h2>
          <p className="text-slate-400 text-sm max-w-lg">
            Votre plateforme d&apos;intelligence SEO propulsée par l&apos;IA Dust. Analysez,
            anticipez et surpassez vos concurrents.
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => onNavigate("dust-agents")}
              className="flex items-center gap-2 bg-[#1B6EF3] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1549C7] transition-colors"
            >
              <Bot size={14} />
              Lancer un agent IA
            </button>
            <button
              onClick={() => onNavigate("seo-positioning")}
              className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
            >
              Voir le SEO
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <button
            key={stat.id}
            onClick={() => onNavigate(stat.id)}
            className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all text-left group hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
              >
                {stat.icon}
              </div>
              <ArrowRight
                size={14}
                className="text-slate-300 group-hover:text-slate-500 transition-colors"
              />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">
              {stat.label}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
          </button>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Traffic chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Trafic Organique
              </h3>
              <p className="text-xs text-slate-400">6 derniers mois</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp size={12} />
              +14.2%
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trafficData}>
              <defs>
                <linearGradient id="colorTrafic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B6EF3" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1B6EF3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
                formatter={(value: number | undefined) => [
                  `${(value ?? 0).toLocaleString()} visites`,
                  "",
                ]}
              />
              <Area
                type="monotone"
                dataKey="trafic"
                stroke="#1B6EF3"
                strokeWidth={2}
                fill="url(#colorTrafic)"
                name="Trafic"
              />
              <Line
                type="monotone"
                dataKey="objectif"
                stroke="#3B82F6"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name="Objectif"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Modules summary */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">
            Modules actifs
          </h3>
          <div className="space-y-3">
            {[
              {
                label: "SEO Organique",
                score: 82,
                color: "#1B6EF3",
                page: "seo-positioning" as PageId,
              },
              {
                label: "GEO / IA",
                score: 68,
                color: "#3B82F6",
                page: "geo-positioning" as PageId,
              },
              {
                label: "Concurrents",
                score: 74,
                color: "#F59E0B",
                page: "competitive-analysis" as PageId,
              },
              {
                label: "Social",
                score: 58,
                color: "#EF4444",
                page: "social-listening" as PageId,
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => onNavigate(item.page)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                    {item.label}
                  </span>
                  <span className="text-xs font-bold" style={{ color: item.color }}>
                    {item.score}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.score}%`, backgroundColor: item.color }}
                  />
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 p-3 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 text-center">
              Score global de performance
            </p>
            <p className="text-2xl font-bold text-slate-900 text-center mt-1">
              71
              <span className="text-sm font-normal text-slate-400">/100</span>
            </p>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 text-sm mb-4">
          Activité récente des agents IA
        </h3>
        <div className="space-y-3">
          {[
            {
              agent: "Agent SEO Audit",
              action: "Analyse complète des positions terminée",
              time: "Il y a 5 min",
              status: "success",
            },
            {
              agent: "Agent GEO Monitor",
              action: "Détection d'une nouvelle mention dans ChatGPT",
              time: "Il y a 23 min",
              status: "info",
            },
            {
              agent: "Agent Social Listener",
              action: "Pic de mentions détecté sur Reddit (r/paie)",
              time: "Il y a 1h",
              status: "warning",
            },
            {
              agent: "Agent Concurrent",
              action: "Sage HR a publié 3 nouvelles pages optimisées",
              time: "Il y a 2h",
              status: "alert",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div
                className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  item.status === "success"
                    ? "bg-emerald-500"
                    : item.status === "info"
                    ? "bg-blue-500"
                    : item.status === "warning"
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700">
                  {item.agent}
                </p>
                <p className="text-xs text-slate-500 truncate">{item.action}</p>
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

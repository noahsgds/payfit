"use client";

import {
  Globe,
  Brain,
  Zap,
  Eye,
  TrendingUp,
  RefreshCw,
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
} from "recharts";
import MetricCard from "../../components/MetricCard";

const aiEngines = [
  {
    name: "ChatGPT",
    logo: "🤖",
    visibility: 72,
    mentions: 284,
    rank: 2,
    trend: 8,
    color: "#10B981",
    query: "logiciel de paie France",
    snippet:
      "PayFit est l'un des logiciels de paie les plus utilisés en France, particulièrement adapté aux PME...",
  },
  {
    name: "Perplexity",
    logo: "🔍",
    visibility: 81,
    mentions: 198,
    rank: 1,
    trend: 15,
    color: "#8B5CF6",
    query: "meilleur SIRH PME",
    snippet:
      "PayFit se distingue par sa simplicité d'utilisation et son interface intuitive pour la gestion RH...",
  },
  {
    name: "Gemini",
    logo: "✨",
    visibility: 58,
    mentions: 142,
    rank: 3,
    trend: -3,
    color: "#3B82F6",
    query: "automatisation paie entreprise",
    snippet:
      "Pour automatiser la paie, des solutions comme PayFit, Sage ou Silae sont souvent recommandées...",
  },
  {
    name: "Claude",
    logo: "🧠",
    visibility: 64,
    mentions: 89,
    rank: 2,
    trend: 22,
    color: "#F59E0B",
    query: "logiciel gestion RH TPE",
    snippet:
      "PayFit propose une solution complète de gestion RH adaptée aux structures de moins de 500 employés...",
  },
];

const radarData = [
  { subject: "ChatGPT", payfit: 72, average: 55 },
  { subject: "Perplexity", payfit: 81, average: 48 },
  { subject: "Gemini", payfit: 58, average: 52 },
  { subject: "Claude", payfit: 64, average: 45 },
  { subject: "Copilot", payfit: 49, average: 40 },
];

const queryData = [
  { query: "logiciel paie", score: 88 },
  { query: "SIRH PME", score: 79 },
  { query: "RH automatisé", score: 71 },
  { query: "bulletin paie", score: 65 },
  { query: "congés salariés", score: 52 },
  { query: "recrutement RH", score: 38 },
];

const geoTips = [
  {
    priority: "Haute",
    color: "#EF4444",
    tip: "Ajouter des FAQ structurées sur les pages /logiciel-paie et /sirh",
    impact: "+12% visibilité GEO estimée",
  },
  {
    priority: "Haute",
    color: "#EF4444",
    tip: "Créer une page dédiée aux comparaisons (PayFit vs Sage, vs Silae)",
    impact: "+8% citations Perplexity",
  },
  {
    priority: "Moyenne",
    color: "#F59E0B",
    tip: "Renforcer le contenu avec des statistiques propriétaires citables",
    impact: "+5% autorité IA",
  },
  {
    priority: "Faible",
    color: "#3B82F6",
    tip: "Améliorer le schema markup Organization et Product",
    impact: "+3% indexation IA",
  },
];

export default function GEOPositioningPage() {
  return (
    <div className="p-6 space-y-6 fade-in">
      {/* GEO Hero */}
      <div className="bg-gradient-to-br from-[#0F1629] via-[#1a2744] to-[#0d1a3a] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={16} className="text-blue-400" />
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            Generative Engine Optimization
          </span>
        </div>
        <h2 className="text-xl font-bold mb-1">
          Visibilité PayFit dans les IA génératives
        </h2>
        <p className="text-slate-400 text-sm mb-4">
          Mesurez et optimisez votre présence dans les réponses des LLMs : ChatGPT, Perplexity, Gemini, Claude.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Score GEO global", value: "68%", icon: <Globe size={14} /> },
            { label: "Moteurs IA surveillés", value: "4", icon: <Brain size={14} /> },
            { label: "Mentions ce mois", value: "713", icon: <Eye size={14} /> },
            { label: "Progression", value: "+11%", icon: <TrendingUp size={14} /> },
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
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Score GEO Moyen"
          value="68%"
          change={11}
          changeLabel="vs mois dernier"
          icon={<Globe size={16} />}
          color="#3B82F6"
        />
        <MetricCard
          title="Top Moteur IA"
          value="Perplexity"
          icon={<Zap size={16} />}
          color="#8B5CF6"
        />
        <MetricCard
          title="Requêtes détectées"
          value="127"
          change={24}
          changeLabel="ce mois"
          icon={<Eye size={16} />}
          color="#1B6EF3"
        />
        <MetricCard
          title="Position moy. IA"
          value="#2.1"
          change={5}
          changeLabel="amélioration"
          icon={<TrendingUp size={16} />}
          color="#F59E0B"
        />
      </div>

      {/* AI Engines + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Radar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-1">
            Couverture par moteur IA
          </h3>
          <p className="text-xs text-slate-400 mb-4">vs moyenne secteur RH</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b" }} />
              <Radar name="PayFit" dataKey="payfit" stroke="#1B6EF3" fill="#1B6EF3" fillOpacity={0.2} strokeWidth={2} />
              <Radar name="Moyenne" dataKey="average" stroke="#CBD5E1" fill="#CBD5E1" fillOpacity={0.1} strokeWidth={1} strokeDasharray="3 3" />
            </RadarChart>
          </ResponsiveContainer>
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

        {/* Per-engine detail */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {aiEngines.map((engine) => (
            <div
              key={engine.name}
              className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{engine.logo}</span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {engine.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <TrendingUp
                    size={11}
                    className={engine.trend > 0 ? "text-emerald-500" : "text-red-500"}
                  />
                  <span
                    className={`font-semibold ${engine.trend > 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {engine.trend > 0 ? "+" : ""}{engine.trend}%
                  </span>
                </div>
              </div>

              {/* Visibility bar */}
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-500">Visibilité</span>
                  <span className="text-xs font-bold" style={{ color: engine.color }}>
                    {engine.visibility}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${engine.visibility}%`, backgroundColor: engine.color }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-50 rounded-xl p-2 text-center">
                  <p className="text-sm font-bold text-slate-900">#{engine.rank}</p>
                  <p className="text-xs text-slate-400">Position moy.</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2 text-center">
                  <p className="text-sm font-bold text-slate-900">{engine.mentions}</p>
                  <p className="text-xs text-slate-400">Mentions</p>
                </div>
              </div>

              {/* Sample snippet */}
              <div className="bg-slate-50 rounded-xl p-2.5">
                <p className="text-xs text-slate-400 mb-1 font-mono">
                  &ldquo;{engine.query}&rdquo;
                </p>
                <p className="text-xs text-slate-600 italic leading-relaxed line-clamp-2">
                  {engine.snippet}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Query performance + recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Query score chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-1">
            Score GEO par thématique
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Probabilité d&apos;être cité par les IA
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={queryData} layout="vertical">
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
                width={90}
              />
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                formatter={(v: number | undefined) => [`${v ?? 0}%`, "Score GEO"]}
              />
              <Bar dataKey="score" fill="#3B82F6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* GEO Recommendations */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Recommandations GEO
              </h3>
              <p className="text-xs text-slate-400">
                Générées par l&apos;agent IA Dust
              </p>
            </div>
            <button className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {geoTips.map((tip, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-lg h-fit flex-shrink-0"
                  style={{
                    color: tip.color,
                    backgroundColor: `${tip.color}15`,
                  }}
                >
                  {tip.priority}
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-700">{tip.tip}</p>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <TrendingUp size={10} className="text-emerald-500" />
                    {tip.impact}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";
import MetricCard from "../../components/MetricCard";

const competitors = [
  {
    name: "PayFit",
    color: "#1B6EF3",
    traffic: 61300,
    keywords: 8420,
    top10: 2280,
    domainRating: 72,
    backlinks: 18400,
    contentPages: 342,
    isUs: true,
  },
  {
    name: "Sage HR",
    color: "#3B82F6",
    traffic: 48700,
    keywords: 6840,
    top10: 1890,
    domainRating: 68,
    backlinks: 24100,
    contentPages: 287,
    isUs: false,
  },
  {
    name: "Lucca",
    color: "#8B5CF6",
    traffic: 38200,
    keywords: 5120,
    top10: 1340,
    domainRating: 65,
    backlinks: 12300,
    contentPages: 198,
    isUs: false,
  },
  {
    name: "Factorial",
    color: "#F59E0B",
    traffic: 52800,
    keywords: 7290,
    top10: 2010,
    domainRating: 70,
    backlinks: 19800,
    contentPages: 421,
    isUs: false,
  },
  {
    name: "Silae",
    color: "#EF4444",
    traffic: 29400,
    keywords: 3940,
    top10: 890,
    domainRating: 58,
    backlinks: 8700,
    contentPages: 134,
    isUs: false,
  },
];

const radarData = [
  { subject: "Trafic", PayFit: 82, "Sage HR": 65, Factorial: 71 },
  { subject: "Mots-clés", PayFit: 78, "Sage HR": 63, Factorial: 68 },
  { subject: "Backlinks", PayFit: 65, "Sage HR": 80, Factorial: 70 },
  { subject: "Contenu", PayFit: 72, "Sage HR": 68, Factorial: 85 },
  { subject: "Domain", PayFit: 80, "Sage HR": 75, Factorial: 78 },
  { subject: "GEO", PayFit: 68, "Sage HR": 45, Factorial: 52 },
];

const opportunities = [
  {
    type: "gap",
    title: "Mot-clé non capturé",
    desc: "Factorial domine 'paie automatique ETI' (1,900 req/mois) — PayFit absent",
    severity: "high",
  },
  {
    type: "threat",
    title: "Sage HR en hausse",
    desc: "Sage HR a publié 12 nouvelles pages sur 'RH PME' ce trimestre",
    severity: "medium",
  },
  {
    type: "gap",
    title: "Opportunité contenu",
    desc: "'Gestion des temps et activités' — 3,200 req/mois, concurrence faible",
    severity: "high",
  },
  {
    type: "threat",
    title: "Lucca renforce les backlinks",
    desc: "Lucca a obtenu 340 nouveaux backlinks qualifiés ce mois",
    severity: "low",
  },
];

const trafficBarData = competitors.map((c) => ({
  name: c.name,
  trafic: c.traffic,
  fill: c.color,
}));

export default function CompetitiveAnalysisPage() {
  const [selected, setSelected] = useState<string[]>(["Sage HR", "Factorial"]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleCompetitor = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Position marché SEO"
          value="#1"
          change={0}
          changeLabel="stable"
          icon={<BarChart2 size={16} />}
          color="#1B6EF3"
        />
        <MetricCard
          title="Avance sur Sage HR"
          value="+20%"
          change={3}
          changeLabel="trafic supérieur"
          icon={<TrendingUp size={16} />}
          color="#3B82F6"
        />
        <MetricCard
          title="Opportunités détectées"
          value="8"
          change={33}
          changeLabel="ce mois"
          icon={<AlertTriangle size={16} />}
          color="#F59E0B"
        />
        <MetricCard
          title="Menaces identifiées"
          value="3"
          change={-25}
          changeLabel="vs mois dernier"
          icon={<TrendingDown size={16} />}
          color="#EF4444"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Traffic comparison */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Trafic organique estimé
              </h3>
              <p className="text-xs text-slate-400">visites/mois — Semrush</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trafficBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#64748b" }}
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
                formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()} visites`]}
              />
              <Bar
                dataKey="trafic"
                radius={[6, 6, 0, 0]}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                fill="#1B6EF3"
                // Use individual fills via Cell if needed
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-1">
            Positionnement multidimensionnel
          </h3>
          <p className="text-xs text-slate-400 mb-2">Score relatif /100</p>
          <div className="flex gap-3 mb-3 flex-wrap">
            {competitors
              .filter((c) => !c.isUs)
              .map((c) => (
                <button
                  key={c.name}
                  onClick={() => toggleCompetitor(c.name)}
                  className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors border ${
                    selected.includes(c.name)
                      ? "border-transparent text-white"
                      : "border-slate-200 text-slate-500 bg-white"
                  }`}
                  style={
                    selected.includes(c.name)
                      ? { backgroundColor: c.color, borderColor: c.color }
                      : {}
                  }
                >
                  {c.name}
                </button>
              ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 9, fill: "#64748b" }}
              />
              <Radar
                name="PayFit"
                dataKey="PayFit"
                stroke="#1B6EF3"
                fill="#1B6EF3"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              {selected.includes("Sage HR") && (
                <Radar
                  name="Sage HR"
                  dataKey="Sage HR"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                  strokeWidth={1.5}
                />
              )}
              {selected.includes("Factorial") && (
                <Radar
                  name="Factorial"
                  dataKey="Factorial"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.1}
                  strokeWidth={1.5}
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Competitors table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">
            Tableau de bord concurrentiel
          </h3>
          <p className="text-xs text-slate-400">
            Données mises à jour quotidiennement par l&apos;agent IA
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                {[
                  "Concurrent",
                  "Trafic organique",
                  "Mots-clés totaux",
                  "Top 10",
                  "Domain Rating",
                  "Backlinks",
                  "Pages contenu",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {competitors.map((comp) => (
                <>
                  <tr
                    key={comp.name}
                    onClick={() =>
                      setExpandedRow(
                        expandedRow === comp.name ? null : comp.name
                      )
                    }
                    className={`border-t border-slate-50 cursor-pointer transition-colors ${
                      comp.isUs
                        ? "bg-[#1B6EF3]/5 hover:bg-[#1B6EF3]/8"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: comp.color }}
                        />
                        <span
                          className={`text-sm font-semibold ${
                            comp.isUs ? "text-[#1B6EF3]" : "text-slate-800"
                          }`}
                        >
                          {comp.name}
                          {comp.isUs && (
                            <span className="ml-1.5 text-xs bg-[#1B6EF3]/15 text-[#1B6EF3] px-1.5 py-0.5 rounded-full">
                              Nous
                            </span>
                          )}
                        </span>
                        {expandedRow === comp.name ? (
                          <ChevronUp size={12} className="text-slate-400 ml-auto" />
                        ) : (
                          <ChevronDown size={12} className="text-slate-400 ml-auto" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                      {comp.traffic.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {comp.keywords.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {comp.top10.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${comp.domainRating}%`,
                              backgroundColor: comp.color,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: comp.color }}>
                          {comp.domainRating}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {comp.backlinks.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {comp.contentPages}
                    </td>
                  </tr>
                  {expandedRow === comp.name && (
                    <tr key={`${comp.name}-detail`} className="border-t border-slate-100">
                      <td colSpan={7} className="px-6 py-4 bg-slate-50">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-700 mb-1">
                              Segments forts
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {["Paie PME", "RH digital", "SIRH SaaS"].map((s) => (
                                <span key={s} className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-600">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-700 mb-1">
                              Évolution trafic
                            </p>
                            <p className="text-xs text-slate-500">
                              {comp.isUs ? "+14.2% ce mois" : "+8.3% ce mois"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-700 mb-1">
                              Dernière activité
                            </p>
                            <p className="text-xs text-slate-500">
                              {comp.isUs
                                ? "Publication de 4 articles blog"
                                : "3 nouvelles pages produit"}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opportunities & threats */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 text-sm mb-4">
          Opportunités & Menaces détectées par l&apos;IA
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {opportunities.map((opp, i) => (
            <div
              key={i}
              className={`flex gap-3 p-4 rounded-xl border ${
                opp.type === "gap"
                  ? "bg-emerald-50 border-emerald-100"
                  : "bg-amber-50 border-amber-100"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  opp.type === "gap"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-amber-100 text-amber-600"
                }`}
              >
                {opp.type === "gap" ? (
                  <TrendingUp size={14} />
                ) : (
                  <AlertTriangle size={14} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-bold text-slate-800">{opp.title}</p>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      opp.severity === "high"
                        ? "bg-red-100 text-red-600"
                        : opp.severity === "medium"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {opp.severity === "high"
                      ? "Haute priorité"
                      : opp.severity === "medium"
                      ? "Moyenne"
                      : "Faible"}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{opp.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Search,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Filter,
  Download,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import MetricCard from "../../components/MetricCard";

const positionData = [
  { month: "Sep", top3: 720, top10: 1840, top30: 3200 },
  { month: "Oct", top3: 756, top10: 1920, top30: 3350 },
  { month: "Nov", top3: 790, top10: 2010, top30: 3480 },
  { month: "Déc", top3: 812, top10: 2080, top30: 3520 },
  { month: "Jan", top3: 830, top10: 2150, top30: 3610 },
  { month: "Fév", top3: 847, top10: 2280, top30: 3740 },
];

const volumeData = [
  { segment: "Paie", volume: 45600, position: 2.1 },
  { segment: "RH", volume: 38200, position: 3.4 },
  { segment: "SIRH", volume: 29800, position: 1.8 },
  { segment: "Congés", volume: 22400, position: 4.2 },
  { segment: "Recrutement", volume: 18700, position: 6.1 },
];

const keywords = [
  {
    keyword: "logiciel de paie",
    volume: 14800,
    position: 1,
    change: 0,
    difficulty: 72,
    traffic: 4200,
  },
  {
    keyword: "logiciel RH PME",
    volume: 8900,
    position: 2,
    change: 1,
    difficulty: 65,
    traffic: 2100,
  },
  {
    keyword: "logiciel paie TPE",
    volume: 6600,
    position: 1,
    change: 0,
    difficulty: 58,
    traffic: 1980,
  },
  {
    keyword: "SIRH France",
    volume: 5400,
    position: 3,
    change: -1,
    difficulty: 80,
    traffic: 1100,
  },
  {
    keyword: "gestion congés salariés",
    volume: 4200,
    position: 5,
    change: 2,
    difficulty: 45,
    traffic: 680,
  },
  {
    keyword: "bulletin de paie en ligne",
    volume: 3800,
    position: 4,
    change: -2,
    difficulty: 62,
    traffic: 720,
  },
  {
    keyword: "logiciel gestion RH",
    volume: 3200,
    position: 7,
    change: 3,
    difficulty: 70,
    traffic: 390,
  },
  {
    keyword: "paie automatique entreprise",
    volume: 2900,
    position: 2,
    change: 1,
    difficulty: 55,
    traffic: 870,
  },
];

export default function SEOPositioningPage() {
  const [filter, setFilter] = useState<"all" | "top3" | "top10" | "falling">(
    "all"
  );
  const [search, setSearch] = useState("");

  const filteredKw = keywords.filter((kw) => {
    const matchSearch = kw.keyword
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchFilter =
      filter === "all"
        ? true
        : filter === "top3"
        ? kw.position <= 3
        : filter === "top10"
        ? kw.position <= 10
        : kw.change < 0;
    return matchSearch && matchFilter;
  });

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Mots-clés Top 3"
          value="847"
          change={12}
          changeLabel="vs mois dernier"
          icon={<Search size={16} />}
          color="#1B6EF3"
        />
        <MetricCard
          title="Mots-clés Top 10"
          value="2,280"
          change={6.5}
          changeLabel="vs mois dernier"
          icon={<TrendingUp size={16} />}
          color="#3B82F6"
        />
        <MetricCard
          title="Trafic Organique"
          value="61.3k"
          change={14.2}
          changeLabel="vs mois dernier"
          icon={<ArrowUpRight size={16} />}
          color="#8B5CF6"
        />
        <MetricCard
          title="Position Moyenne"
          value="4.7"
          change={-8.3}
          changeLabel="amélioration"
          icon={<Filter size={16} />}
          color="#F59E0B"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Evolution positions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Évolution des positions
              </h3>
              <p className="text-xs text-slate-400">
                Nombre de mots-clés par cluster
              </p>
            </div>
            <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors">
              <Download size={12} />
              Export
            </button>
          </div>
          <div className="flex gap-4 mb-4">
            {[
              { label: "Top 3", color: "#1B6EF3" },
              { label: "Top 10", color: "#3B82F6" },
              { label: "Top 30", color: "#E2E8F0" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={positionData}>
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
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="top3"
                stroke="#1B6EF3"
                strokeWidth={2.5}
                dot={{ fill: "#1B6EF3", r: 4 }}
                name="Top 3"
              />
              <Line
                type="monotone"
                dataKey="top10"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: "#3B82F6", r: 3 }}
                name="Top 10"
              />
              <Line
                type="monotone"
                dataKey="top30"
                stroke="#CBD5E1"
                strokeWidth={1.5}
                dot={false}
                name="Top 30"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Volume par segment */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-1">
            Volume par segment
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Recherches mensuelles estimées
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={volumeData} layout="vertical">
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                dataKey="segment"
                type="category"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
                formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()} req/mois`]}
              />
              <Bar dataKey="volume" fill="#1B6EF3" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Keywords table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">
              Mots-clés principaux
            </h3>
            <p className="text-xs text-slate-400">
              {filteredKw.length} mots-clés affichés
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Search size={12} className="text-slate-400" />
              <input
                type="text"
                placeholder="Filtrer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs bg-transparent outline-none text-slate-700 w-32"
              />
            </div>
            {(["all", "top3", "top10", "falling"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${
                  filter === f
                    ? "bg-[#1B6EF3] text-white"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {f === "all"
                  ? "Tous"
                  : f === "top3"
                  ? "Top 3"
                  : f === "top10"
                  ? "Top 10"
                  : "En baisse"}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                {[
                  "Mot-clé",
                  "Volume",
                  "Position",
                  "Évolution",
                  "Difficulté",
                  "Trafic estimé",
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
              {filteredKw.map((kw, i) => (
                <tr
                  key={i}
                  className="border-t border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">
                      {kw.keyword}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {kw.volume.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-bold ${
                        kw.position <= 3
                          ? "bg-emerald-50 text-emerald-700"
                          : kw.position <= 10
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {kw.position}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {kw.change > 0 ? (
                        <TrendingUp size={12} className="text-emerald-500" />
                      ) : kw.change < 0 ? (
                        <TrendingDown size={12} className="text-red-500" />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      <span
                        className={`text-xs font-semibold ${
                          kw.change > 0
                            ? "text-emerald-600"
                            : kw.change < 0
                            ? "text-red-600"
                            : "text-slate-400"
                        }`}
                      >
                        {kw.change > 0 ? `+${kw.change}` : kw.change || ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${kw.difficulty}%`,
                            backgroundColor:
                              kw.difficulty >= 70
                                ? "#EF4444"
                                : kw.difficulty >= 50
                                ? "#F59E0B"
                                : "#1B6EF3",
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {kw.difficulty}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                    {kw.traffic.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

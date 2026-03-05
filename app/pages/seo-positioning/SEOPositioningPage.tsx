"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeoData {
  timestamp: string | null;
  trends: {
    labels: string[];
    series: Record<string, number[]>;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTrendChartData(
  labels: string[],
  series: Record<string, number[]>
) {
  return labels.map((label, i) => ({
    date: label,
    PayFit: series["PayFit"]?.[i] ?? 0,
    "logiciel paie": series["logiciel paie"]?.[i] ?? 0,
    "logiciel RH": series["logiciel RH"]?.[i] ?? 0,
  }));
}

const TREND_COLORS: Record<string, string> = {
  PayFit: "#1B6EF3",
  "logiciel paie": "#8B5CF6",
  "logiciel RH": "#F59E0B",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SEOPositioningPage() {
  const [seoData, setSeoData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/seo-data")
      .then((r) => r.json())
      .then((d: SeoData) => setSeoData(d))
      .catch(() => setSeoData(null))
      .finally(() => setLoading(false));
  }, []);

  const trendChartData =
    seoData?.trends?.labels?.length
      ? buildTrendChartData(seoData.trends.labels, seoData.trends.series)
      : [];

  const lastUpdated = seoData?.timestamp
    ? new Date(seoData.timestamp).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-sm text-slate-400">Chargement des données…</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Google Trends */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">
              Google Trends — intérêt de recherche
            </h3>
            <p className="text-xs text-slate-400">
              Données réelles Google Trends FR · 90 derniers jours
              {lastUpdated && (
                <span className="ml-2 text-slate-300">· {lastUpdated}</span>
              )}
            </p>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg font-medium">
            Live
          </span>
        </div>

        <div className="flex gap-4 mt-3 mb-4">
          {Object.keys(TREND_COLORS).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <div
                className="w-3 h-2 rounded-full"
                style={{ backgroundColor: TREND_COLORS[k] }}
              />
              <span className="text-xs text-slate-500">{k}</span>
            </div>
          ))}
        </div>

        {trendChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(trendChartData.length / 8)}
              />
              <YAxis
                domain={[0, 100]}
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
              {Object.keys(TREND_COLORS).map((k) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={TREND_COLORS[k]}
                  strokeWidth={2}
                  dot={false}
                  name={k}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-sm text-slate-400">
            Aucune donnée disponible
          </div>
        )}
      </div>
    </div>
  );
}

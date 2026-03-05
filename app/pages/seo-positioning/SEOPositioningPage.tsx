"use client";

import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ExternalLink, RefreshCw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SerpResult {
  keyword: string;
  position: number | null;
  url: string | null;
  title: string | null;
}

interface SeoData {
  timestamp: string | null;
  trends: { labels: string[]; series: Record<string, number[]> };
  serp: SerpResult[];
  serpRunFinishedAt: string | null;
  serpError: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTrendChartData(labels: string[], series: Record<string, number[]>) {
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

function PositionBadge({ position }: { position: number | null }) {
  if (position === null)
    return <span className="text-xs text-slate-400 font-medium">—</span>;
  const color =
    position <= 3 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : position <= 10 ? "bg-blue-50 text-blue-700 border-blue-200"
    : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-bold border ${color}`}>
      {position}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SEOPositioningPage() {
  const [seoData, setSeoData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false); // run Apify en cours
  const [pollSeconds, setPollSeconds] = useState(0);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/seo-data")
      .then((r) => r.json())
      .then((d: SeoData) => setSeoData(d))
      .catch(() => setSeoData(null))
      .finally(() => setLoading(false));

    return () => stopPolling();
  }, []);

  function stopPolling() {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  }

  function startPolling(runId: string) {
    setPolling(true);
    setPollSeconds(0);
    let elapsed = 0;

    pollInterval.current = setInterval(async () => {
      elapsed += 5;
      setPollSeconds(elapsed);

      try {
        const res = await fetch(`/api/serp-status?runId=${runId}`);
        const json = await res.json() as {
          status: string;
          serp?: SerpResult[];
          finishedAt?: string;
        };

        if (json.status === "SUCCEEDED" && json.serp) {
          stopPolling();
          setPolling(false);
          setSeoData((prev) =>
            prev
              ? { ...prev, serp: json.serp!, serpRunFinishedAt: json.finishedAt ?? null }
              : prev
          );
        } else if (json.status === "FAILED" || json.status === "ABORTED") {
          stopPolling();
          setPolling(false);
        }
      } catch {
        // réseau instable, on réessaie au prochain tick
      }
    }, 5000);
  }

  async function triggerRefresh() {
    stopPolling();
    setPolling(true);
    setPollSeconds(0);

    try {
      const res = await fetch("/api/serp-refresh", { method: "POST" });
      const json = await res.json() as { runId?: string; error?: string };
      if (json.runId) {
        startPolling(json.runId);
      } else {
        setPolling(false);
      }
    } catch {
      setPolling(false);
    }
  }

  const trendChartData = seoData?.trends?.labels?.length
    ? buildTrendChartData(seoData.trends.labels, seoData.trends.series)
    : [];

  const serp = seoData?.serp ?? [];

  const serpDate = seoData?.serpRunFinishedAt
    ? new Date(seoData.serpRunFinishedAt).toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  const lastUpdated = seoData?.timestamp
    ? new Date(seoData.timestamp).toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
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
            <h3 className="font-semibold text-slate-900 text-sm">Google Trends — intérêt de recherche</h3>
            <p className="text-xs text-slate-400">
              Données réelles Google Trends FR · 90 derniers jours
              {lastUpdated && <span className="ml-2 text-slate-300">· {lastUpdated}</span>}
            </p>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg font-medium">Live</span>
        </div>

        <div className="flex gap-4 mt-3 mb-4">
          {Object.keys(TREND_COLORS).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-full" style={{ backgroundColor: TREND_COLORS[k] }} />
              <span className="text-xs text-slate-500">{k}</span>
            </div>
          ))}
        </div>

        {trendChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={Math.floor(trendChartData.length / 8)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
              {Object.keys(TREND_COLORS).map((k) => (
                <Line key={k} type="monotone" dataKey={k} stroke={TREND_COLORS[k]} strokeWidth={2} dot={false} name={k} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-sm text-slate-400">Aucune donnée disponible</div>
        )}
      </div>

      {/* SERP */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Positions Google — PayFit.com</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {polling
                ? <span className="text-blue-500">Scrape en cours… {pollSeconds}s</span>
                : serp.length > 0
                ? <>Données SERP réelles · France{serpDate && <> · dernier run {serpDate}</>}</>
                : seoData?.serpError
                ? <span className="text-red-500">{seoData.serpError}</span>
                : "Aucun run disponible — cliquez sur Rafraîchir"}
            </p>
          </div>
          <button
            onClick={triggerRefresh}
            disabled={polling}
            className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={12} className={polling ? "animate-spin" : ""} />
            {polling ? `${pollSeconds}s…` : "Rafraîchir"}
          </button>
        </div>

        {polling && serp.length === 0 ? (
          // Skeleton pendant le chargement initial
          <div className="p-6 space-y-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-48" />
                <div className="h-8 w-8 bg-slate-100 rounded-xl" />
                <div className="h-4 bg-slate-100 rounded w-8" />
                <div className="h-4 bg-slate-100 rounded w-32" />
              </div>
            ))}
          </div>
        ) : serp.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Mot-clé</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Position</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Page</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 hidden sm:table-cell">URL</th>
              </tr>
            </thead>
            <tbody>
              {serp.map((row, i) => (
                <tr key={i} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.keyword}</td>
                  <td className="px-4 py-3"><PositionBadge position={row.position} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {row.position !== null ? `p.${Math.ceil(row.position / 10)}` : "—"}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {row.url ? (
                      <a href={row.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate max-w-xs">
                        <ExternalLink size={10} />
                        {row.url.replace("https://", "").split("/")[0]}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-300">Non classé</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-sm text-slate-400">
            Cliquez sur &quot;Rafraîchir&quot; pour lancer un scrape Apify (~2 min).
          </div>
        )}
      </div>
    </div>
  );
}

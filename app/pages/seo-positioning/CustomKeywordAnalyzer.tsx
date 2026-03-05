"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, RefreshCw, X, ExternalLink, Search } from "lucide-react";
import type { KeywordAnalysis } from "../../api/serp-keyword/route";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeywordEntry {
  keyword: string;
  data: KeywordAnalysis | null;
  loading: boolean;
  error: string | null;
}

const STORAGE_KEY = "customKeywords_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PositionChip({ pos }: { pos: number | null }) {
  if (pos === null)
    return <span className="text-xs text-slate-400">Non classé (top 100)</span>;
  const color =
    pos <= 3 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : pos <= 10 ? "bg-blue-50 text-blue-700 border-blue-200"
    : pos <= 20 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold border px-2 py-0.5 rounded-lg ${color}`}>
      PayFit #{pos}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomKeywordAnalyzer() {
  const [entries, setEntries] = useState<KeywordEntry[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as KeywordEntry[];
        setEntries(parsed.map((e) => ({ ...e, loading: false })));
      }
    } catch { /* ignore */ }
  }, []);

  function persist(updated: KeywordEntry[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  }

  async function analyzeKeyword(keyword: string): Promise<KeywordAnalysis | null> {
    const res = await fetch("/api/serp-keyword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<KeywordAnalysis>;
  }

  function setEntryState(keyword: string, patch: Partial<KeywordEntry>) {
    setEntries((prev) => {
      const next = prev.map((e) => e.keyword === keyword ? { ...e, ...patch } : e);
      persist(next);
      return next;
    });
  }

  async function addKeyword() {
    const kw = input.trim().toLowerCase();
    if (!kw) return;
    if (entries.some((e) => e.keyword === kw)) {
      setInput("");
      return;
    }

    const entry: KeywordEntry = { keyword: kw, data: null, loading: true, error: null };
    setEntries((prev) => {
      const next = [entry, ...prev];
      persist(next);
      return next;
    });
    setInput("");
    inputRef.current?.focus();

    try {
      const data = await analyzeKeyword(kw);
      setEntryState(kw, { data, loading: false });
    } catch (e) {
      setEntryState(kw, { loading: false, error: e instanceof Error ? e.message : "Erreur" });
    }
  }

  async function refresh(keyword: string) {
    setEntryState(keyword, { loading: true, error: null });
    try {
      const data = await analyzeKeyword(keyword);
      setEntryState(keyword, { data, loading: false });
    } catch (e) {
      setEntryState(keyword, { loading: false, error: e instanceof Error ? e.message : "Erreur" });
    }
  }

  function remove(keyword: string) {
    setEntries((prev) => {
      const next = prev.filter((e) => e.keyword !== keyword);
      persist(next);
      return next;
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") addKeyword();
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 text-sm">Analyse personnalisée</h3>
        <p className="text-xs text-slate-400 mt-0.5">Ajoutez des mots-clés pour voir leur top 5 Google et la position PayFit</p>
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ex : logiciel de paie TPE…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
            />
          </div>
          <button
            onClick={addKeyword}
            disabled={!input.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={14} />
            Analyser
          </button>
        </div>
      </div>

      {/* Results */}
      {entries.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-slate-400">Aucun mot-clé analysé. Ajoutez-en un ci-dessus.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {entries.map((entry) => (
            <div key={entry.keyword} className="px-5 py-4">

              {/* Keyword header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800">{entry.keyword}</span>
                  {!entry.loading && entry.data && (
                    <PositionChip pos={entry.data.payfitPosition} />
                  )}
                  {entry.data?.fetchedAt && (
                    <span className="text-[10px] text-slate-300">
                      {new Date(entry.data.fetchedAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => refresh(entry.keyword)}
                    disabled={entry.loading}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-40 transition-colors"
                    title="Relancer"
                  >
                    <RefreshCw size={13} className={entry.loading ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={() => remove(entry.keyword)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* State: loading */}
              {entry.loading && (
                <div className="h-20 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <RefreshCw size={12} className="animate-spin" />
                    Analyse en cours…
                  </div>
                </div>
              )}

              {/* State: error */}
              {!entry.loading && entry.error && (
                <p className="text-xs text-red-500">{entry.error}</p>
              )}

              {/* State: results */}
              {!entry.loading && entry.data && (
                <ol className="space-y-1.5">
                  {entry.data.organic.slice(0, 5).map((r) => {
                    const isPayfit = r.link.includes("payfit.com");
                    return (
                      <li
                        key={r.position}
                        className={`flex gap-3 p-2.5 rounded-xl text-xs transition-colors ${
                          isPayfit
                            ? "bg-blue-50 border border-blue-200"
                            : "bg-slate-50 border border-transparent"
                        }`}
                      >
                        {/* Position number */}
                        <span className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] ${
                          isPayfit ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                        }`}>
                          {r.position}
                        </span>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-1.5">
                            <a
                              href={r.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`font-semibold leading-tight hover:underline truncate ${
                                isPayfit ? "text-blue-700" : "text-slate-700"
                              }`}
                            >
                              {r.title}
                            </a>
                            <ExternalLink size={10} className="flex-shrink-0 mt-0.5 text-slate-300" />
                          </div>
                          <p className="text-slate-400 mt-0.5 text-[11px] truncate">{r.domain}</p>
                          {r.snippet && (
                            <p className="text-slate-500 mt-1 line-clamp-2 leading-relaxed">{r.snippet}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

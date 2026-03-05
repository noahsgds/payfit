"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Play, Loader2, AlertCircle, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FieldDef {
  name:        string;
  label:       string;
  type:        "text" | "textarea";
  placeholder?: string;
}

export interface ModeConfig {
  label:  string;
  fields: FieldDef[];
}

interface Props {
  title:         string;
  description?:  string;
  icon?:         string;
  agentEndpoint: string;
  /** Simple array of fields (no mode toggle) */
  fields?:       FieldDef[];
  /** Multiple modes — shows a toggle. Provide this OR fields, not both. */
  modes?:        Record<string, ModeConfig>;
}

// ─── Poll helper ──────────────────────────────────────────────────────────────

async function pollResult(jobId: string, maxAttempts = 60): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const res  = await fetch(`/api/dust-result?jobId=${jobId}`);
    const data = await res.json() as { status: string; result?: string };
    if (data.status === "done" && data.result) return data.result;
  }
  throw new Error("Timeout : l'agent a mis trop longtemps à répondre (>2 min).");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DustAgentPanel({
  title, description, icon = "🤖", agentEndpoint, fields, modes,
}: Props) {
  const hasModes   = !!modes;
  const modeKeys   = modes ? Object.keys(modes) : [];
  const [activeMode, setActiveMode] = useState<string>(modeKeys[0] ?? "");

  const activeFields: FieldDef[] = hasModes
    ? (modes![activeMode]?.fields ?? [])
    : (fields ?? []);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [output,   setOutput]   = useState<string>("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string>("");
  const [copied,   setCopied]   = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleModeChange = (mode: string) => {
    setActiveMode(mode);
    setFormData({});
    setOutput("");
    setError("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setOutput("");
    try {
      const payload = hasModes
        ? { ...formData, mode: activeMode }
        : formData;

      const res  = await fetch(agentEndpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json() as { jobId?: string; error?: string };

      if (!res.ok || !data.jobId) throw new Error(data.error ?? `HTTP ${res.status}`);

      const result = await pollResult(data.jobId);
      setOutput(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canSubmit = !loading && (activeFields.length === 0 ||
    activeFields.every(f => f.type === "textarea" ? true : true)); // no required enforcement — keep it simple

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin text-[#1B6EF3]" />}
          {output && !loading && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-medium">Résultat dispo</span>
          )}
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-50">

          {/* ── Mode toggle ── */}
          {hasModes && modeKeys.length > 0 && (
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mt-4">
              {modeKeys.map(mode => (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  disabled={loading}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeMode === mode
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {modes![mode].label}
                </button>
              ))}
            </div>
          )}

          {/* ── Form fields ── */}
          {activeFields.length > 0 && (
            <div className="space-y-3 mt-4">
              {activeFields.map(field => (
                field.type === "textarea" ? (
                  <textarea
                    key={field.name}
                    rows={5}
                    placeholder={field.placeholder ?? field.label}
                    value={formData[field.name] ?? ""}
                    disabled={loading}
                    onChange={e => setFormData(d => ({ ...d, [field.name]: e.target.value }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none
                      focus:border-[#1B6EF3] focus:bg-white resize-none transition-colors disabled:opacity-50"
                  />
                ) : (
                  <input
                    key={field.name}
                    type="text"
                    placeholder={field.placeholder ?? field.label}
                    value={formData[field.name] ?? ""}
                    disabled={loading}
                    onChange={e => setFormData(d => ({ ...d, [field.name]: e.target.value }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none
                      focus:border-[#1B6EF3] focus:bg-white transition-colors disabled:opacity-50"
                  />
                )
              ))}
            </div>
          )}

          {/* ── Launch button ── */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold
              bg-[#1B6EF3] text-white hover:bg-[#1549C7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <><Loader2 size={13} className="animate-spin" /> Agent en cours (20–60s)…</>
            ) : (
              <><Play size={13} /> Lancer l&apos;agent</>
            )}
          </button>

          {/* ── Error ── */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
              <AlertCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* ── Output ── */}
          {output && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-medium text-slate-600">Résultat</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {copied ? <><Check size={11} className="text-emerald-500" /> Copié</> : <><Copy size={11} /> Copier</>}
                </button>
              </div>
              <div className="p-4 prose prose-sm prose-slate max-w-none text-xs overflow-y-auto max-h-[500px]">
                <ReactMarkdown>{output}</ReactMarkdown>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

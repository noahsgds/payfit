"use client";

import { useMemo, useState } from "react";
import {
  Braces,
  ClipboardCheck,
  FileText,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";
import { claudeSeoAgents, ClaudeSeoAgent } from "../../lib/claudeSeoAgents";

const iconMap: Record<ClaudeSeoAgent["icon"], React.ReactNode> = {
  clipboard: <ClipboardCheck size={20} />,
  wrench: <Wrench size={20} />,
  file: <FileText size={20} />,
  code: <Braces size={20} />,
  sparkles: <Sparkles size={20} />,
  map: <MapPin size={20} />,
};

export default function ClaudeSeoPage() {
  const [url, setUrl] = useState("https://payfit.com");
  const [selectedAgentId, setSelectedAgentId] = useState(claudeSeoAgents[0].id);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null);

  const selectedAgent = useMemo(
    () => claudeSeoAgents.find((agent) => agent.id === selectedAgentId) || claudeSeoAgents[0],
    [selectedAgentId],
  );

  const runAgent = async (agent: ClaudeSeoAgent = selectedAgent) => {
    setSelectedAgentId(agent.id);
    setRunningAgentId(agent.id);
    setError("");
    setResult("");

    try {
      const response = await fetch("/api/claude-seo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, url }),
      });

      const data = (await response.json()) as { result?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Claude SEO analysis failed.");
      }

      setResult(data.result || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claude SEO analysis failed.");
    } finally {
      setRunningAgentId(null);
    }
  };

  const reset = () => {
    setResult("");
    setError("");
    setRunningAgentId(null);
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1B6EF3]">
          Claude SEO agents
        </p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">SEO Analysis Dashboard</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Run specialist SEO audits through Anthropic Claude using focused expert prompts
              inspired by the claude-seo agent framework.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
            API key: <span className="font-mono text-slate-800">ANTHROPIC_API_KEY</span> in Vercel
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Target URL</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://payfit.com"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#1B6EF3] focus:ring-2 focus:ring-[#1B6EF3]/10"
            />
          </label>
          <button
            onClick={() => runAgent()}
            disabled={Boolean(runningAgentId)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1B6EF3] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1549C7] disabled:cursor-not-allowed disabled:bg-slate-300 lg:mt-5"
          >
            {runningAgentId ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Run
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {claudeSeoAgents.map((agent) => {
          const isSelected = selectedAgentId === agent.id;
          const isRunning = runningAgentId === agent.id;

          return (
            <button
              key={agent.id}
              onClick={() => runAgent(agent)}
              disabled={Boolean(runningAgentId)}
              className={`group relative min-h-36 overflow-hidden rounded-lg border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed ${
                isSelected ? "border-slate-300 ring-2 ring-slate-900/5" : "border-slate-200"
              }`}
            >
              <span
                className="absolute inset-y-0 left-0 w-1.5"
                style={{ backgroundColor: agent.accent }}
              />
              <div className="flex items-start gap-3 pl-2">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${agent.accent}14`, color: agent.accent }}
                >
                  {isRunning ? <Loader2 size={20} className="animate-spin" /> : iconMap[agent.icon]}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-950">{agent.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {agent.description}
                  </span>
                </span>
              </div>
              <span className="mt-4 block pl-2 text-xs font-semibold text-slate-400 group-hover:text-slate-600">
                Click to run this agent
              </span>
            </button>
          );
        })}
      </section>

      {(result || error || runningAgentId) && (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-950">Analysis output</h2>
              <p className="text-xs text-slate-500">
                {runningAgentId ? "Claude is analyzing the URL..." : selectedAgent.label}
              </p>
            </div>
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RotateCcw size={14} />
              Clear
            </button>
          </div>

          <div className="max-h-[520px] overflow-y-auto p-4">
            {runningAgentId && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                <Loader2 size={16} className="animate-spin" />
                Running {selectedAgent.label} for {url}
              </div>
            )}
            {error && (
              <pre className="whitespace-pre-wrap rounded-lg border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">
                {error}
              </pre>
            )}
            {result && (
              <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100">
                {result}
              </pre>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

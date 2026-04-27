"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileSearch,
  History,
  Loader2,
  Send,
  Server,
  Trash2,
  Wrench,
} from "lucide-react";

const HISTORY_KEY = "payfit-dust-agent-history";

const pipelineAgents = [
  {
    label: "Content engine",
    role: "PayFit_ContentEngine",
    description: "Identifie, score et priorise jusqu'à 5 sujets SEO B2B RH/Paie pour PayFit.",
    details:
      "Travaille en français pour les dirigeants et responsables RH de TPE/PME. Il s'appuie sur les sources légales, concurrentielles, tendances et corpus PayFit, puis retourne un tableau de scoring et un JSON pipeline.",
    sid: "W4MzQnXJu3",
    color: "#1B6EF3",
  },
  {
    label: "Validation manuelle",
    role: "PayFit_AgentCréa",
    description: "Transforme un brief KPI ou un thème clair en brouillon d'article PayFit validable.",
    details:
      "Rédige en français pour les employeurs TPE/PME avec bloc À retenir, H2 interrogatifs, CTA, sources et points de vigilance avant mise en ligne.",
    sid: "2HHu8YbPTV",
    color: "#10B981",
  },
  {
    label: "Backlinks final",
    role: "PayFit_AgentBacklinks",
    description: "Ajoute le maillage interne et quelques liens officiels sans modifier le contenu éditorial.",
    details:
      "Reçoit le payload final validé, n'ajoute des liens que sur des ancres déjà présentes, privilégie PayFit et retourne un rapport de maillage puis l'article markdown final.",
    sid: "5A064iifFp",
    color: "#F59E0B",
  },
];

const promptPresets = [
  {
    label: "SEO Analysis",
    icon: <FileSearch size={15} />,
    prompt:
      "Analyse SEO complète de https://payfit.com : priorise les opportunités techniques, contenu, maillage interne, E-E-A-T et GEO. Donne un plan d'action clair.",
  },
  {
    label: "Content Gap",
    icon: <ClipboardList size={15} />,
    prompt:
      "Identifie les content gaps SEO pour PayFit face aux concurrents RH/paie. Propose les pages ou articles à créer, avec intention de recherche et priorité business.",
  },
  {
    label: "Keyword Research",
    icon: <FileSearch size={15} />,
    prompt:
      "Fais une recherche de mots-clés pour PayFit autour de logiciel paie, SIRH, gestion RH, conformité et PME. Groupe par cluster, intention et niveau de priorité.",
  },
  {
    label: "Technical Audit",
    icon: <Wrench size={15} />,
    prompt:
      "Réalise un audit technique SEO pour https://payfit.com : crawlabilité, indexabilité, performance, canonicals, sitemap, robots, structured data et risques JS.",
  },
];

interface DustHistoryItem {
  id: string;
  agentLabel: string;
  agentSid: string;
  conversationId: string;
  createdAt: string;
  message: string;
  result: string;
  status: "succeeded" | "error";
}

export default function DustAgentsPage() {
  const [workspaceId, setWorkspaceId] = useState("vTiqcjUPSf");
  const [agentSid, setAgentSid] = useState("W4MzQnXJu3");
  const [message, setMessage] = useState(promptPresets[0].prompt);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<DustHistoryItem[]>([]);

  const selectedAgent = useMemo(
    () => pipelineAgents.find((agent) => agent.sid === agentSid) || pipelineAgents[0],
    [agentSid],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(HISTORY_KEY);
    if (!saved) {
      return;
    }

    try {
      setHistory(JSON.parse(saved) as DustHistoryItem[]);
    } catch {
      window.localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  const saveHistory = (items: DustHistoryItem[]) => {
    setHistory(items);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  };

  const addHistoryItem = (item: DustHistoryItem) => {
    saveHistory([item, ...history].slice(0, 25));
  };

  const sendToDust = async () => {
    setError("");
    setResult("");
    setConversationId("");

    if (!workspaceId.trim() || !agentSid.trim() || !message.trim()) {
      setError("Workspace ID, Agent sId and message are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/dust-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          agentSid,
          message,
        }),
      });

      const data = (await response.json()) as {
        conversationId?: string;
        result?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Dust request failed.");
      }

      const responseText = data.result || "";
      const cId = data.conversationId || "";
      setConversationId(cId);
      setResult(responseText);
      addHistoryItem({
        id: `${Date.now()}`,
        agentLabel: selectedAgent.label,
        agentSid,
        conversationId: cId,
        createdAt: new Date().toISOString(),
        message,
        result: responseText,
        status: "succeeded",
      });
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Dust request failed.";
      setError(messageText);
      addHistoryItem({
        id: `${Date.now()}`,
        agentLabel: selectedAgent.label,
        agentSid,
        conversationId: "",
        createdAt: new Date().toISOString(),
        message,
        result: messageText,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#10B981]">
          Dust REST API
        </p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Dust Agent Pipeline</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Send SEO prompts to your Dust.tt agents, create a conversation, poll the response,
              and keep the pipeline moving from content engine to validation and backlinks.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
            API key: <span className="font-mono text-slate-800">DUST_API_KEY</span> on Vercel
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-600">Workspace ID</span>
            <input
              value={workspaceId}
              onChange={(event) => setWorkspaceId(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm outline-none transition-colors focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-600">Agent sId</span>
            <input
              value={agentSid}
              onChange={(event) => setAgentSid(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm outline-none transition-colors focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {pipelineAgents.map((agent) => (
            <button
              key={agent.sid}
              onClick={() => setAgentSid(agent.sid)}
              className={`rounded-lg border bg-white p-3 text-left transition-all hover:shadow-sm ${
                agentSid === agent.sid ? "border-slate-900 ring-2 ring-slate-900/5" : "border-slate-200"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-bold text-slate-950">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: agent.color }} />
                {agent.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{agent.description}</span>
              <span className="mt-2 block font-mono text-xs text-slate-400">{agent.sid}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Selected agent
          </p>
          <h3 className="mt-2 text-sm font-bold text-slate-950">{selectedAgent.role}</h3>
          <p className="mt-1 text-sm text-slate-600">{selectedAgent.details}</p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {promptPresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => setMessage(preset.prompt)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {preset.icon}
              {preset.label}
            </button>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Message to agent</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={8}
            className="w-full resize-none rounded-lg border border-slate-200 p-3 text-sm leading-6 text-slate-900 outline-none transition-colors focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
          />
        </label>

        <button
          onClick={sendToDust}
          disabled={loading}
          className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Send to Dust
        </button>
      </section>

      {history.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div className="flex items-center gap-2">
              <History size={17} className="text-slate-500" />
              <div>
                <h2 className="text-sm font-bold text-slate-950">Conversation history</h2>
                <p className="text-xs text-slate-500">Stored locally in this browser.</p>
              </div>
            </div>
            <button
              onClick={() => saveHistory([])}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Trash2 size={14} />
              Clear history
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setAgentSid(item.agentSid);
                  setMessage(item.message);
                  setResult(item.status === "succeeded" ? item.result : "");
                  setError(item.status === "error" ? item.result : "");
                  setConversationId(item.conversationId);
                }}
                className="block w-full p-4 text-left transition-colors hover:bg-slate-50"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <span className="text-sm font-semibold text-slate-950">{item.agentLabel}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={13} />
                    {new Date(item.createdAt).toLocaleString("fr-FR")}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.message}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-xs text-slate-500">
                    {item.agentSid}
                  </span>
                  {item.conversationId && (
                    <span className="rounded-full bg-blue-50 px-2 py-1 font-mono text-xs text-blue-600">
                      {item.conversationId}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      item.status === "succeeded"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {(loading || error || result) && (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div>
              <h2 className="text-sm font-bold text-slate-950">Agent response</h2>
              <p className="text-xs text-slate-500">
                {conversationId ? `Conversation ${conversationId}` : "Waiting for Dust"}
              </p>
            </div>
            {result && <CheckCircle2 size={18} className="text-emerald-500" />}
          </div>
          <div className="max-h-[520px] overflow-y-auto p-4">
            {loading && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                <Loader2 size={16} className="animate-spin" />
                Polling Dust every 2 seconds...
              </div>
            )}
            {error && (
              <div className="flex gap-2 rounded-lg border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {result && (
              <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100">
                {result}
              </pre>
            )}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Server size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-emerald-950">Dust setup guide</h2>
            <div className="mt-2 grid grid-cols-1 gap-3 text-xs leading-5 text-emerald-800 md:grid-cols-3">
              <p>
                <strong>API key:</strong> store the Dust key in Vercel as
                <span className="font-mono"> DUST_API_KEY</span>. It is never displayed in the dashboard.
              </p>
              <p>
                <strong>Workspace ID:</strong> copy it from a Dust URL after <span className="font-mono">/w/</span>.
                For this workspace, the default is <span className="font-mono">vTiqcjUPSf</span>.
              </p>
              <p>
                <strong>Agent sId:</strong> use the short agent configuration id, for example
                <span className="font-mono"> W4MzQnXJu3</span>, <span className="font-mono">2HHu8YbPTV</span>,
                or <span className="font-mono">5A064iifFp</span>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

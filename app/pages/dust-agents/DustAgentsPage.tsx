"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Database,
  ExternalLink,
  FileSearch,
  History,
  KeyRound,
  Layers3,
  Loader2,
  MessageSquareText,
  Play,
  RotateCcw,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";

const HISTORY_KEY = "payfit-dust-agent-history";

const pipelineAgents = [
  {
    label: "Content engine",
    role: "PayFit_ContentEngine",
    description: "Detecte, score et priorise les sujets SEO RH/Paie.",
    details:
      "Premier agent de la pipeline. Il travaille pour les dirigeants et RH de TPE/PME, croise sources legales, tendances et concurrence, puis produit un scoring et un JSON exploitable.",
    sid: "W4MzQnXJu3",
    color: "#2563EB",
    icon: <Layers3 size={18} />,
  },
  {
    label: "Validation crea",
    role: "PayFit_AgentCrea",
    description: "Transforme un brief ou theme en brouillon validable.",
    details:
      "Agent de validation editoriale. Il structure un article PayFit avec meta, points de vigilance, bloc A retenir, H2, sources et CTA.",
    sid: "2HHu8YbPTV",
    color: "#059669",
    icon: <MessageSquareText size={18} />,
  },
  {
    label: "Backlinks final",
    role: "PayFit_AgentBacklinks",
    description: "Ajoute le maillage sans toucher au fond editorial.",
    details:
      "Derniere etape. Il ajoute des liens internes PayFit et jusqu'a deux sources officielles externes sur des ancres deja presentes.",
    sid: "5A064iifFp",
    color: "#D97706",
    icon: <ExternalLink size={18} />,
  },
];

const promptPresets = [
  {
    label: "SEO Analysis",
    hint: "Vue globale priorisee",
    icon: <FileSearch size={16} />,
    prompt:
      "Analyse SEO complete de https://payfit.com : priorise les opportunites techniques, contenu, maillage interne, E-E-A-T et GEO. Donne un plan d'action clair.",
  },
  {
    label: "Content Gap",
    hint: "Sujets manquants",
    icon: <ClipboardList size={16} />,
    prompt:
      "Identifie les content gaps SEO pour PayFit face aux concurrents RH/paie. Propose les pages ou articles a creer, avec intention de recherche et priorite business.",
  },
  {
    label: "Keyword Research",
    hint: "Clusters et intentions",
    icon: <FileSearch size={16} />,
    prompt:
      "Fais une recherche de mots-cles pour PayFit autour de logiciel paie, SIRH, gestion RH, conformite et PME. Groupe par cluster, intention et niveau de priorite.",
  },
  {
    label: "Technical Audit",
    hint: "Indexation et perf",
    icon: <Wrench size={16} />,
    prompt:
      "Realise un audit technique SEO pour https://payfit.com : crawlabilite, indexabilite, performance, canonicals, sitemap, robots, structured data et risques JS.",
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

  const resetOutput = () => {
    setResult("");
    setError("");
    setConversationId("");
  };

  const copyResult = async () => {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(result);
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
    <div className="min-h-full bg-[#F6F7FA]">
      <div className="border-b border-slate-200 bg-white">
        <div className="px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Sparkles size={14} className="text-[#2563EB]" />
                Dust orchestration
              </div>
              <h1 className="mt-2 text-2xl font-bold text-slate-950">Pipeline agents SEO</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Lance les agents Dust PayFit, garde un historique local et recupere les reponses via le stream serveur. La cle API reste uniquement dans Vercel.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <StatusPill icon={<KeyRound size={14} />} label="API key" value="DUST_API_KEY" tone="neutral" />
              <StatusPill icon={<Database size={14} />} label="Workspace" value={workspaceId || "missing"} tone="blue" />
              <StatusPill icon={<ShieldCheck size={14} />} label="Auth" value="server only" tone="green" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-1 border-b border-slate-100 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="border-b border-slate-100 p-4 lg:border-b-0 lg:border-r">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Configuration
                </p>
                <div className="mt-4 space-y-3">
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-slate-600">Workspace ID</span>
                    <input
                      value={workspaceId}
                      onChange={(event) => setWorkspaceId(event.target.value)}
                      className="h-10 w-full border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 outline-none transition-colors focus:border-slate-900"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-slate-600">Agent sId</span>
                    <input
                      value={agentSid}
                      onChange={(event) => setAgentSid(event.target.value)}
                      className="h-10 w-full border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 outline-none transition-colors focus:border-slate-900"
                    />
                  </label>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Agent pipeline
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Choisis l'etape a lancer.</p>
                  </div>
                  <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
                    Content <ArrowRight size={13} /> Crea <ArrowRight size={13} /> Links
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  {pipelineAgents.map((agent, index) => (
                    <button
                      key={agent.sid}
                      onClick={() => setAgentSid(agent.sid)}
                      className={`group relative border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        agentSid === agent.sid
                          ? "border-slate-950 shadow-sm"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ backgroundColor: agent.color }}
                      />
                      <span className="flex items-start justify-between gap-3">
                        <span
                          className="flex h-9 w-9 items-center justify-center text-white"
                          style={{ backgroundColor: agent.color }}
                        >
                          {agent.icon}
                        </span>
                        <span className="font-mono text-xs text-slate-400">0{index + 1}</span>
                      </span>
                      <span className="mt-3 block text-sm font-bold text-slate-950">{agent.label}</span>
                      <span className="mt-1 block min-h-10 text-xs leading-5 text-slate-500">
                        {agent.description}
                      </span>
                      <span className="mt-3 block font-mono text-xs text-slate-400">{agent.sid}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="border-b border-slate-100 p-4 lg:border-b-0 lg:border-r">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Agent actif
                </p>
                <h2 className="mt-2 text-base font-bold text-slate-950">{selectedAgent.role}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selectedAgent.details}</p>
              </div>

              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Actions rapides
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {promptPresets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setMessage(preset.prompt)}
                      className="border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:border-slate-300 hover:bg-white"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        {preset.icon}
                        {preset.label}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">{preset.hint}</span>
                    </button>
                  ))}
                </div>

                <label className="mt-4 block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Message a envoyer</span>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={9}
                    className="w-full resize-none border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-900 outline-none transition-colors focus:border-slate-900"
                  />
                </label>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-500">
                    {message.length.toLocaleString("fr-FR")} caracteres vers{" "}
                    <span className="font-mono text-slate-800">{selectedAgent.sid}</span>
                  </div>
                  <div className="flex gap-2">
                    {(result || error) && (
                      <button
                        onClick={resetOutput}
                        className="inline-flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <RotateCcw size={16} />
                        Reset
                      </button>
                    )}
                    <button
                      onClick={sendToDust}
                      disabled={loading}
                      className="inline-flex h-11 min-w-36 items-center justify-center gap-2 bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Send to Dust
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-slate-950">Agent response</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {conversationId ? `Conversation ${conversationId}` : "Aucune conversation active"}
                </p>
              </div>
              <div className="flex gap-2">
                {result && (
                  <button
                    onClick={copyResult}
                    className="inline-flex h-9 items-center justify-center gap-2 border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                )}
                {result && <CheckCircle2 size={18} className="mt-2 text-emerald-500" />}
              </div>
            </div>
            <div className="max-h-[560px] min-h-64 overflow-y-auto p-4">
              {!loading && !error && !result && (
                <div className="flex min-h-52 flex-col items-center justify-center border border-dashed border-slate-200 bg-slate-50 text-center">
                  <Play size={24} className="text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">Pret a lancer un agent</p>
                  <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                    Selectionne une etape, ajuste le prompt puis envoie la requete. La reponse apparaitra ici.
                  </p>
                </div>
              )}
              {loading && (
                <div className="flex items-center gap-3 border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                  <Loader2 size={18} className="animate-spin" />
                  Connexion au stream Dust en cours...
                </div>
              )}
              {error && (
                <div className="border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">
                  <div className="flex gap-2">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Erreur Dust</p>
                      <p className="mt-1">{error}</p>
                      {error.includes("401") && (
                        <p className="mt-3 text-xs leading-5 text-red-600">
                          Le code 401 vient de Dust. Verifie que la variable Vercel DUST_API_KEY est presente dans l'environnement de ce deploiement, que la cle est active, et que son compte a acces au workspace {workspaceId}.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {result && (
                <pre className="whitespace-pre-wrap border border-slate-200 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100">
                  {result}
                </pre>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <History size={17} className="text-slate-500" />
                <div>
                  <h2 className="text-sm font-bold text-slate-950">Historique</h2>
                  <p className="text-xs text-slate-500">{history.length} conversation(s)</p>
                </div>
              </div>
              {history.length > 0 && (
                <button
                  onClick={() => saveHistory([])}
                  className="inline-flex h-8 items-center gap-1 border border-slate-200 px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Trash2 size={13} />
                  Clear
                </button>
              )}
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              {history.length === 0 && (
                <div className="p-4 text-sm leading-6 text-slate-500">
                  Les discussions lancees depuis ce navigateur seront stockees ici.
                </div>
              )}
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
                  className="block w-full border-b border-slate-100 p-4 text-left transition-colors last:border-b-0 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-950">{item.agentLabel}</span>
                    <span
                      className={`shrink-0 px-2 py-1 text-xs font-semibold ${
                        item.status === "succeeded"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.message}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={13} />
                    {new Date(item.createdAt).toLocaleString("fr-FR")}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-emerald-100 text-emerald-700">
                <Server size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-emerald-950">Setup Dust</h2>
                <div className="mt-2 space-y-3 text-xs leading-5 text-emerald-800">
                  <p>
                    <strong>API key:</strong> ajouter la cle dans Vercel sous{" "}
                    <span className="font-mono">DUST_API_KEY</span>, puis redeployer.
                  </p>
                  <p>
                    <strong>Workspace:</strong> l'id est apres <span className="font-mono">/w/</span> dans l'URL Dust. Ici:{" "}
                    <span className="font-mono">vTiqcjUPSf</span>.
                  </p>
                  <p>
                    <strong>401:</strong> la cle est absente, invalide, pas redeployee, ou sans acces au workspace/agent.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function StatusPill({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "neutral" | "blue" | "green";
}) {
  const tones = {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
  };

  return (
    <div className={`flex items-center gap-2 border px-3 py-2 ${tones[tone]}`}>
      {icon}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">{label}</p>
        <p className="font-mono text-xs">{value}</p>
      </div>
    </div>
  );
}

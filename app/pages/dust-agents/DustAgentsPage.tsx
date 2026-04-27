"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  KeyRound,
  Loader2,
  Send,
  Server,
  Wrench,
} from "lucide-react";

const DUST_API_BASE = "https://dust.tt/api/v1";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60;

const pipelineAgents = [
  {
    label: "Content engine",
    description: "Premier agent à lancer dans la pipeline",
    sid: "W4MzQnXJu3",
    color: "#1B6EF3",
  },
  {
    label: "Validation manuelle",
    description: "Agent créa pour la relecture et validation",
    sid: "2HHu8YbPTV",
    color: "#10B981",
  },
  {
    label: "Backlinks final",
    description: "Agent backlinks pour l'article final",
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
    icon: <KeyRound size={15} />,
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

type DustJson = Record<string, unknown>;

function getConversationId(data: DustJson) {
  const conversation = data.conversation as DustJson | undefined;
  return String(
    conversation?.sId ||
      conversation?.id ||
      data.conversationId ||
      data.sId ||
      data.id ||
      "",
  );
}

function collectMessages(node: unknown): DustJson[] {
  if (!node || typeof node !== "object") {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectMessages);
  }

  const object = node as DustJson;
  const candidates: DustJson[] = [];
  const type = object.type || object.role;

  if (
    type === "agent_message" ||
    type === "agent_message_success" ||
    object.status === "succeeded"
  ) {
    candidates.push(object);
  }

  for (const value of Object.values(object)) {
    if (value && typeof value === "object") {
      candidates.push(...collectMessages(value));
    }
  }

  return candidates;
}

function extractText(node: unknown): string {
  if (typeof node === "string") {
    return node;
  }

  if (!node || typeof node !== "object") {
    return "";
  }

  if (Array.isArray(node)) {
    return node.map(extractText).filter(Boolean).join("\n\n");
  }

  const object = node as DustJson;
  for (const key of ["text", "content", "value", "markdown", "message"]) {
    const value = object[key];
    const text = extractText(value);
    if (text) {
      return text;
    }
  }

  return "";
}

function findSucceededAgentResponse(data: DustJson) {
  const messages = collectMessages(data);
  const succeeded = messages
    .filter((message) => message.status === "succeeded")
    .reverse();

  for (const message of succeeded) {
    const text = extractText(message);
    if (text) {
      return text;
    }
  }

  return "";
}

export default function DustAgentsPage() {
  const [apiKey, setApiKey] = useState("");
  const [workspaceId, setWorkspaceId] = useState("vTiqcjUPSf");
  const [agentSid, setAgentSid] = useState("W4MzQnXJu3");
  const [message, setMessage] = useState(promptPresets[0].prompt);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [loading, setLoading] = useState(false);

  const sendToDust = async () => {
    setError("");
    setResult("");
    setConversationId("");

    if (!apiKey.trim() || !workspaceId.trim() || !agentSid.trim() || !message.trim()) {
      setError("API Key, Workspace ID, Agent sId and message are required.");
      return;
    }

    setLoading(true);

    try {
      const content = `@${agentSid} ${message.trim()}`;
      const createResponse = await fetch(
        `${DUST_API_BASE}/w/${encodeURIComponent(workspaceId.trim())}/assistant/conversations`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey.trim()}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            title: "PayFit SEO Dust request",
            message: {
              content,
              mentions: [{ configurationId: agentSid.trim() }],
              context: {
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
            },
            skipToolsValidation: false,
          }),
        },
      );

      const createData = (await createResponse.json().catch(() => ({}))) as DustJson;

      if (!createResponse.ok) {
        throw new Error(extractText(createData) || `Dust conversation failed (${createResponse.status}).`);
      }

      const createdConversationId = getConversationId(createData);
      if (!createdConversationId) {
        throw new Error("Dust created the conversation but did not return a conversation id.");
      }

      setConversationId(createdConversationId);

      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        const pollResponse = await fetch(
          `${DUST_API_BASE}/w/${encodeURIComponent(
            workspaceId.trim(),
          )}/assistant/conversations/${encodeURIComponent(createdConversationId)}`,
          {
            method: "GET",
            headers: {
              authorization: `Bearer ${apiKey.trim()}`,
            },
          },
        );

        const pollData = (await pollResponse.json().catch(() => ({}))) as DustJson;

        if (!pollResponse.ok) {
          throw new Error(extractText(pollData) || `Dust polling failed (${pollResponse.status}).`);
        }

        const responseText = findSucceededAgentResponse(pollData);
        if (responseText) {
          setResult(responseText);
          return;
        }
      }

      throw new Error("The Dust agent did not finish within 2 minutes. Try again or open the conversation in Dust.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dust request failed.");
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
            Workspace: <span className="font-mono text-slate-800">vTiqcjUPSf</span>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-600">API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Dust API key"
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition-colors focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </label>
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
                <strong>API key:</strong> open Dust, go to developer/API settings, create a key,
                and paste it here. The key is used only for the browser request.
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

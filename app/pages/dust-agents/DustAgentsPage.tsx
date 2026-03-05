"use client";

import { useState } from "react";
import {
  Bot,
  Play,
  Settings,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  description: string;
  status: "active" | "idle" | "error";
  lastRun: string;
  runs: number;
  agentId: string;
  capabilities: string[];
  color: string;
}

const agents: Agent[] = [
  {
    id: "seo-audit",
    name: "Agent SEO Audit",
    description:
      "Analyse automatique des positions, opportunités de mots-clés et recommandations d'optimisation technique pour PayFit.",
    status: "active",
    lastRun: "Il y a 5 min",
    runs: 247,
    agentId: "@seo-audit-payfit",
    capabilities: [
      "Audit technique",
      "Analyse de mots-clés",
      "Recommandations contenu",
      "Suivi positions",
    ],
    color: "#1B6EF3",
  },
  {
    id: "geo-monitor",
    name: "Agent GEO Monitor",
    description:
      "Surveille la visibilité de PayFit dans les réponses IA (ChatGPT, Perplexity, Gemini) et optimise le contenu pour la GEO.",
    status: "idle",
    lastRun: "Il y a 2h",
    runs: 89,
    agentId: "@geo-monitor-payfit",
    capabilities: [
      "Scan IA responses",
      "Score de visibilité",
      "Optimisation GEO",
      "Alertes mentions",
    ],
    color: "#3B82F6",
  },
  {
    id: "competitive-intel",
    name: "Agent Competitive Intel",
    description:
      "Analyse continue des stratégies SEO des concurrents (Sage HR, Lucca, Factorial, Workday) et détecte les opportunités.",
    status: "active",
    lastRun: "Il y a 30 min",
    runs: 156,
    agentId: "@competitive-intel-payfit",
    capabilities: [
      "Suivi concurrents",
      "Gap analysis",
      "Alertes nouvelles pages",
      "Benchmarking",
    ],
    color: "#F59E0B",
  },
];

const statusConfig = {
  active: {
    label: "Actif",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
    icon: <CheckCircle size={12} />,
  },
  idle: {
    label: "En attente",
    color: "text-slate-500",
    bg: "bg-slate-50",
    dot: "bg-slate-400",
    icon: <Clock size={12} />,
  },
  error: {
    label: "Erreur",
    color: "text-red-600",
    bg: "bg-red-50",
    dot: "bg-red-500",
    icon: <AlertCircle size={12} />,
  },
};

interface ChatMessage {
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

function AgentChat({ agent }: { agent: Agent }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "agent",
      content: `Bonjour ! Je suis ${agent.name}. Comment puis-je vous aider aujourd'hui ?`,
      timestamp: "maintenant",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const mockResponses: Record<string, string[]> = {
    "seo-audit": [
      "J'analyse actuellement 2,847 mots-clés pour PayFit. Les positions top 3 représentent 847 termes soit une hausse de +12% ce mois.",
      "Recommandation : optimisez la page /logiciel-paie — elle peut gagner 3 positions sur 'logiciel de paie PME'.",
      "Audit technique terminé : 94% des pages sont indexées. 23 erreurs 404 détectées, je vous prépare la liste.",
    ],
    "geo-monitor": [
      "PayFit est mentionné dans 68% des réponses IA sur 'logiciel RH France'. Perplexity vous cite en #2.",
      "Nouveau : ChatGPT-4o vous recommande pour 'gestion paie TPE'. Opportunité de renforcer ce segment.",
      "Score GEO actuel : 7.2/10. Pour progresser, je recommande d'enrichir les pages avec des FAQ structurées.",
    ],
    "competitive-intel": [
      "Sage HR a publié 3 nouvelles pages ciblant 'logiciel SIRH'. Leur trafic estimé augmente de 8% ce mois.",
      "Opportunité détectée : Factorial est absent sur 'paie automatique ETI' — 1,900 recherches/mois non capturées.",
      "Lucca renforce son blog RH avec 12 articles ce trimestre. Gap content identifié sur les fiches de paie.",
    ],
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      role: "user",
      content: input,
      timestamp: "maintenant",
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const responses = mockResponses[agent.id] || [];
      const response =
        responses[Math.floor(Math.random() * responses.length)] ||
        "Je traite votre demande...";
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: response, timestamp: "maintenant" },
      ]);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Zap size={12} className="text-[#1B6EF3]" />
          Chat avec l&apos;agent
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="mt-3 fade-in">
          <div className="bg-slate-50 rounded-xl p-3 h-40 overflow-y-auto space-y-2 mb-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-xl text-xs ${
                    msg.role === "user"
                      ? "bg-[#1B6EF3] text-white"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={`Demandez à ${agent.name}...`}
              className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B6EF3] transition-colors"
            />
            <button
              onClick={sendMessage}
              className="p-2 bg-[#1B6EF3] text-white rounded-xl hover:bg-[#1549C7] transition-colors"
            >
              <Send size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DustAgentsPage() {
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = (agentId: string) => {
    setConnecting(agentId);
    setTimeout(() => setConnecting(null), 2000);
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header card */}
      <div className="bg-gradient-to-r from-[#0F1629] to-[#1a2744] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#1B6EF3] flex items-center justify-center">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="font-bold">Agents IA Dust</h2>
            <p className="text-slate-400 text-xs">
              3 agents connectés et opérationnels
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          {[
            { label: "Agents actifs", value: "2/3" },
            { label: "Analyses ce mois", value: "1,247" },
            { label: "Insights générés", value: "89" },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Setup guide */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <h3 className="font-semibold text-blue-900 text-sm mb-3">
          Comment connecter un agent Dust
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: "1",
              title: "Créez votre espace Dust",
              desc: "Accédez à dust.tt et créez un compte avec votre email PayFit",
            },
            {
              step: "2",
              title: "Configurez l'agent",
              desc: "Définissez le nom @agent, le modèle et les sources de données",
            },
            {
              step: "3",
              title: "Copiez l'Agent ID",
              desc: "Collez l'identifiant @agent dans le champ dédié ci-dessous",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {item.step}
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-900">
                  {item.title}
                </p>
                <p className="text-xs text-blue-600 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <a
          href="https://dust.tt"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:underline"
        >
          Ouvrir Dust.tt <ExternalLink size={11} />
        </a>
      </div>

      {/* Agents list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const sc = statusConfig[agent.status];
          return (
            <div
              key={agent.id}
              className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Agent header */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${agent.color}15` }}
                >
                  <Bot size={18} style={{ color: agent.color }} />
                </div>
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${
                      agent.status === "active" ? "animate-pulse-dot" : ""
                    }`}
                  />
                  {sc.label}
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 text-sm">
                {agent.name}
              </h3>
              <p className="text-xs text-[#1B6EF3] font-mono mt-0.5 mb-2">
                {agent.agentId}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {agent.description}
              </p>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1 mt-3">
                {agent.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="text-xs bg-slate-50 border border-slate-100 text-slate-600 px-2 py-0.5 rounded-lg"
                  >
                    {cap}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-slate-50 rounded-xl p-2 text-center">
                  <p className="text-sm font-bold text-slate-900">
                    {agent.runs}
                  </p>
                  <p className="text-xs text-slate-400">Analyses</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2 text-center">
                  <p className="text-sm font-bold text-slate-900">
                    {agent.lastRun}
                  </p>
                  <p className="text-xs text-slate-400">Dernière exec.</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleConnect(agent.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-[#1B6EF3] text-white hover:bg-[#1549C7] transition-colors"
                >
                  {connecting === agent.id ? (
                    <>
                      <Clock size={12} className="animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    <>
                      <Play size={12} />
                      Exécuter
                    </>
                  )}
                </button>
                <button className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                  <Settings size={14} />
                </button>
              </div>

              {/* Chat */}
              <AgentChat agent={agent} />
            </div>
          );
        })}
      </div>

      {/* Add agent CTA */}
      <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-[#1B6EF3] transition-colors cursor-pointer group">
        <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-[#1B6EF3]/10 flex items-center justify-center mx-auto mb-3 transition-colors">
          <Bot
            size={20}
            className="text-slate-400 group-hover:text-[#1B6EF3] transition-colors"
          />
        </div>
        <h3 className="font-semibold text-slate-700 text-sm">
          Ajouter un nouvel agent
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          Connectez un agent Dust supplémentaire pour enrichir votre plateforme
          SEO Intelligence
        </p>
        <button className="mt-3 text-xs font-medium text-[#1B6EF3] hover:underline">
          + Configurer un agent
        </button>
      </div>
    </div>
  );
}

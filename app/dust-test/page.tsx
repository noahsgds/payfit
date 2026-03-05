"use client";

/**
 * PAGE DE TEST — à supprimer après validation
 * URL : /dust-test
 * Pour supprimer : rm -rf app/dust-test app/api/dust-test
 */

import { useState } from "react";

const DEFAULT_AGENT_ID = process.env.NEXT_PUBLIC_DUST_TEST_AGENT ?? "pDpPKsFzPE";

export default function DustTestPage() {
  const [agentConfigId, setAgentConfigId] = useState(DEFAULT_AGENT_ID);
  const [message, setMessage] = useState("Dis bonjour en une phrase.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    answer?: string;
    conversationId?: string;
    error?: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/dust-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, agentConfigId }),
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 border border-yellow-500/40 bg-yellow-500/10 rounded-lg p-4">
          <p className="text-yellow-400 text-sm font-mono">
            ⚠️ PAGE DE TEST — à supprimer après validation
          </p>
          <p className="text-yellow-300/60 text-xs mt-1 font-mono">
            rm -rf app/dust-test app/api/dust-test
          </p>
        </div>

        <h1 className="text-2xl font-bold mb-2">Test API Dust</h1>
        <p className="text-gray-400 text-sm mb-8">
          Vérifie que la clé API et l&apos;agent répondent correctement.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Agent Config ID */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Agent Config ID
            </label>
            <input
              type="text"
              value={agentConfigId}
              onChange={(e) => setAgentConfigId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
              placeholder="ex: pDpPKsFzPE"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Tape ton message pour l'agent..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || !message || !agentConfigId}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg py-3 font-semibold transition-colors"
          >
            {loading ? "En attente de l'agent…" : "Envoyer"}
          </button>
        </form>

        {/* Résultat */}
        {result && (
          <div className="mt-8 space-y-3">
            {result.error ? (
              <div className="border border-red-500/40 bg-red-500/10 rounded-lg p-4">
                <p className="text-red-400 text-sm font-semibold mb-1">Erreur</p>
                <p className="text-red-300 text-sm font-mono">{result.error}</p>
              </div>
            ) : (
              <>
                <div className="border border-green-500/40 bg-green-500/10 rounded-lg p-4">
                  <p className="text-green-400 text-xs font-mono mb-1">
                    ✓ Succès · conversation: {result.conversationId}
                  </p>
                </div>
                <div className="border border-gray-700 bg-gray-900 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-2">Réponse de l&apos;agent</p>
                  <pre className="text-white text-sm whitespace-pre-wrap leading-relaxed">
                    {result.answer}
                  </pre>
                </div>
              </>
            )}
          </div>
        )}

        {/* Config info */}
        <div className="mt-10 border border-gray-800 rounded-lg p-4 text-xs font-mono text-gray-500 space-y-1">
          <p>DUST_WORKSPACE_ID = {process.env.NEXT_PUBLIC_DUST_WORKSPACE_ID ?? "vTiqcjUPSf (hardcodé)"}</p>
          <p>DUST_API_KEY = *** (côté serveur)</p>
          <p>Route API = POST /api/dust-test</p>
        </div>
      </div>
    </div>
  );
}

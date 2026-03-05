import { setJobResult } from "./jobStore";

const DUST_API_URL = "https://dust.tt/api/v1";
const WORKSPACE_ID = process.env.DUST_WORKSPACE_ID ?? "vTiqcjUPSf";

/**
 * Appelle directement l'API Dust, stream les événements SSE,
 * et stocke le résultat dans le jobStore quand l'agent a terminé.
 *
 * @param agentEnvVar  Nom de la variable d'env contenant l'agentConfigId Dust
 *                     (ex: "DUST_AGENT_SEO_ANALYZER" → process.env.DUST_AGENT_SEO_ANALYZER)
 */
export async function triggerDustAgent(
  jobId: string,
  message: string,
  agentEnvVar: string
): Promise<void> {
  const apiKey = process.env.DUST_API_KEY;
  if (!apiKey) throw new Error("DUST_API_KEY non configuré");

  const agentConfigId = process.env[agentEnvVar];
  if (!agentConfigId) throw new Error(`${agentEnvVar} non configuré`);

  // 1. Créer la conversation + envoyer le message
  const convRes = await fetch(
    `${DUST_API_URL}/w/${WORKSPACE_ID}/assistant/conversations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visibility: "unlisted",
        title: null,
        message: {
          content: message,
          mentions: [{ configurationId: agentConfigId }],
          context: {
            timezone: "Europe/Paris",
            username: "payfit-dashboard",
            fullName: "PayFit Dashboard",
            email: "noreply@payfit.com",
            profilePictureUrl: null,
            origin: "api",
          },
        },
      }),
    }
  );

  if (!convRes.ok) {
    const text = await convRes.text().catch(() => "");
    throw new Error(`Dust API error ${convRes.status}: ${text}`);
  }

  const { conversation } = (await convRes.json()) as {
    conversation: { sId: string };
  };
  const conversationId = conversation.sId;

  // 2. Stream les événements SSE pour récupérer la réponse
  const eventsRes = await fetch(
    `${DUST_API_URL}/w/${WORKSPACE_ID}/assistant/conversations/${conversationId}/events`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  if (!eventsRes.ok || !eventsRes.body) {
    throw new Error(`Dust events error ${eventsRes.status}`);
  }

  let answer = "";
  const reader = eventsRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;

      let event: { type: string; text?: string; error?: { message: string } };
      try {
        event = JSON.parse(raw);
      } catch {
        continue;
      }

      if (event.type === "generation_tokens" && event.text) {
        answer += event.text;
      } else if (event.type === "agent_message_success") {
        break;
      } else if (event.type === "agent_error" && event.error) {
        throw new Error(`Agent error: ${event.error.message}`);
      }
    }
  }

  // 3. Stocker le résultat
  await setJobResult(jobId, answer || "Aucune réponse reçue");
}

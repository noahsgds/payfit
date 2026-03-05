/**
 * PAGE DE TEST — à supprimer après validation
 * Route : POST /api/dust-test
 * Appelle directement l'API Dust et retourne la réponse en streaming SSE.
 */
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const WORKSPACE_ID = process.env.DUST_WORKSPACE_ID ?? "vTiqcjUPSf";
const DUST_API_URL = "https://dust.tt/api/v1";

export async function POST(req: NextRequest) {
  const { message, agentConfigId } = await req
    .json()
    .catch(() => ({})) as { message?: string; agentConfigId?: string };

  if (!message || !agentConfigId) {
    return NextResponse.json(
      { error: "message et agentConfigId sont requis" },
      { status: 400 }
    );
  }

  const apiKey = process.env.DUST_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DUST_API_KEY non configuré sur Vercel" },
      { status: 500 }
    );
  }

  // 1. Créer la conversation
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
            username: "test-page",
            fullName: "Test Page",
            email: "test@payfit.com",
            profilePictureUrl: null,
            origin: "api",
          },
        },
      }),
    }
  );

  if (!convRes.ok) {
    const text = await convRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Dust API ${convRes.status}: ${text}` },
      { status: 502 }
    );
  }

  const { conversation } = (await convRes.json()) as {
    conversation: { sId: string };
  };

  // 2. Stream les événements SSE et collecter la réponse
  const eventsRes = await fetch(
    `${DUST_API_URL}/w/${WORKSPACE_ID}/assistant/conversations/${conversation.sId}/events`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  if (!eventsRes.ok || !eventsRes.body) {
    return NextResponse.json(
      { error: `Dust events ${eventsRes.status}` },
      { status: 502 }
    );
  }

  let answer = "";
  const reader = eventsRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const event = JSON.parse(raw) as {
          type: string;
          text?: string;
          error?: { message: string };
        };
        if (event.type === "generation_tokens" && event.text) {
          answer += event.text;
        } else if (event.type === "agent_message_success") {
          break outer;
        } else if (event.type === "agent_error" && event.error) {
          return NextResponse.json(
            { error: `Agent error: ${event.error.message}` },
            { status: 502 }
          );
        }
      } catch {
        continue;
      }
    }
  }

  return NextResponse.json({
    conversationId: conversation.sId,
    answer: answer || "Aucune réponse reçue",
  });
}

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const DUST_API_BASE = "https://dust.tt/api/v1";

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

async function readDustEvents(response: Response) {
  if (!response.body) {
    throw new Error("Dust events stream is empty.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }

      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") {
        continue;
      }

      let event: DustJson;
      try {
        event = JSON.parse(raw) as DustJson;
      } catch {
        continue;
      }

      if (event.type === "generation_tokens") {
        answer += typeof event.text === "string" ? event.text : "";
      }

      if (event.type === "agent_error") {
        throw new Error(extractText(event.error) || "Dust agent returned an error.");
      }

      if (event.type === "agent_message_success") {
        return answer.trim() || extractText(event);
      }
    }
  }

  return answer.trim();
}

async function dustFetch(path: string, init: RequestInit, apiKey: string) {
  return fetch(`${DUST_API_BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.DUST_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing DUST_API_KEY. Add it in Vercel Project Settings > Environment Variables." },
      { status: 500 },
    );
  }

  const { workspaceId, agentSid, message } = (await req.json().catch(() => ({}))) as {
    workspaceId?: string;
    agentSid?: string;
    message?: string;
  };

  if (!workspaceId || !agentSid || !message) {
    return NextResponse.json(
      { error: "Workspace ID, Agent sId and message are required." },
      { status: 400 },
    );
  }

  const wId = workspaceId.trim();
  const configurationId = agentSid.trim();

  const createResponse = await dustFetch(
    `/w/${encodeURIComponent(wId)}/assistant/conversations`,
    {
      method: "POST",
      body: JSON.stringify({
        visibility: "unlisted",
        title: "PayFit SEO Dust pipeline",
        message: {
          content: message.trim(),
          mentions: [{ configurationId }],
          context: {
            timezone: "Europe/Paris",
            username: "payfit-dashboard",
            fullName: "PayFit Dashboard",
            email: "noreply@payfit.com",
            profilePictureUrl: null,
            origin: "api",
          },
        },
        skipToolsValidation: false,
      }),
    },
    apiKey,
  );

  const createData = (await createResponse.json().catch(() => ({}))) as DustJson;
  if (!createResponse.ok) {
    return NextResponse.json(
      { error: extractText(createData) || `Dust conversation failed (${createResponse.status}).` },
      { status: createResponse.status },
    );
  }

  const conversationId = getConversationId(createData);
  if (!conversationId) {
    return NextResponse.json(
      { error: "Dust created the conversation but did not return a conversation id." },
      { status: 502 },
    );
  }

  const eventsResponse = await dustFetch(
    `/w/${encodeURIComponent(wId)}/assistant/conversations/${encodeURIComponent(conversationId)}/events`,
    { method: "GET" },
    apiKey,
  );

  if (!eventsResponse.ok) {
    const errorText = await eventsResponse.text().catch(() => "");
    return NextResponse.json(
      { conversationId, error: errorText || `Dust events failed (${eventsResponse.status}).` },
      { status: eventsResponse.status },
    );
  }

  try {
    const result = await readDustEvents(eventsResponse);
    return NextResponse.json({
      conversationId,
      result: result || "Aucune réponse reçue depuis Dust.",
      status: "succeeded",
    });
  } catch (error) {
    return NextResponse.json(
      {
        conversationId,
        error: error instanceof Error ? error.message : "Dust events stream failed.",
      },
      { status: 502 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const DUST_API_BASE = "https://dust.tt/api/v1";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 25;

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
  const content = `@${configurationId} ${message.trim()}`;

  const createResponse = await dustFetch(
    `/w/${encodeURIComponent(wId)}/assistant/conversations`,
    {
      method: "POST",
      body: JSON.stringify({
        title: "PayFit SEO Dust pipeline",
        message: {
          content,
          mentions: [{ configurationId }],
          context: {
            timezone: "Europe/Paris",
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

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const pollResponse = await dustFetch(
      `/w/${encodeURIComponent(wId)}/assistant/conversations/${encodeURIComponent(conversationId)}`,
      { method: "GET" },
      apiKey,
    );

    const pollData = (await pollResponse.json().catch(() => ({}))) as DustJson;
    if (!pollResponse.ok) {
      return NextResponse.json(
        { error: extractText(pollData) || `Dust polling failed (${pollResponse.status}).` },
        { status: pollResponse.status },
      );
    }

    const result = findSucceededAgentResponse(pollData);
    if (result) {
      return NextResponse.json({
        conversationId,
        result,
        status: "succeeded",
      });
    }
  }

  return NextResponse.json(
    {
      conversationId,
      error: "The Dust agent did not finish before the server timeout. Open the conversation in Dust or retry.",
      status: "timeout",
    },
    { status: 504 },
  );
}

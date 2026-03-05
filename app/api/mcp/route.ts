import { NextRequest, NextResponse } from "next/server";
import { setJobResult } from "../../lib/jobStore";

// MCP protocol — Streamable HTTP (2025-03-26) + SSE discovery (2024-11-05 compat)
// https://modelcontextprotocol.io/specification/2025-03-26/basic/transports

const TOOL_NAME = "payfit_store_result";
const SERVER_INFO = { name: "payfit-mcp", version: "1.0.0" };
const PROTOCOL_VERSION = "2024-11-05";

type JsonRpc = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method?: string;
  params?: unknown;
};

function ok(id: string | number | null | undefined, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function err(id: string | number | null | undefined, code: number, message: string) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    { status: 200 } // MCP errors are 200 with error body
  );
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
};

// ── OPTIONS — CORS preflight ──────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// ── GET — SSE transport discovery (backward compat with 2024-11-05 clients) ───
// Sends the POST endpoint URL via SSE then closes the stream.

export async function GET(req: NextRequest) {
  const endpoint = `${req.nextUrl.origin}/api/mcp`;
  const body = `event: endpoint\ndata: ${endpoint}\n\n`;

  return new Response(body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

// ── POST — Streamable HTTP (all JSON-RPC messages) ───────────────────────────

export async function POST(req: NextRequest) {
  let body: JsonRpc;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400, headers: corsHeaders }
    );
  }

  const { id, method } = body;

  console.log(`[mcp] → ${method ?? "notification"} (id=${JSON.stringify(id)})`);

  // Notifications (no id) — acknowledge only
  if (id === undefined || id === null) {
    if (method) {
      console.log(`[mcp] notification: ${method}`);
      return new NextResponse(null, { status: 202, headers: corsHeaders });
    }
  }

  // ── initialize ─────────────────────────────────────────────────────────────
  if (method === "initialize") {
    const sessionId = crypto.randomUUID();
    const response = ok(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
    response.headers.set("Mcp-Session-Id", sessionId);
    Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
    console.log(`[mcp] initialized session ${sessionId}`);
    return response;
  }

  // ── tools/list ─────────────────────────────────────────────────────────────
  if (method === "tools/list") {
    return ok(id, {
      tools: [
        {
          name: TOOL_NAME,
          description:
            "Stocke le contenu généré par l'agent pour un jobId donné. " +
            "Appelle cet outil dès que tu as terminé de générer le contenu.",
          inputSchema: {
            type: "object",
            properties: {
              jobId: {
                type: "string",
                description: "Identifiant unique du job (fourni dans le message reçu)",
              },
              content: {
                type: "string",
                description: "Contenu Markdown généré par l'agent",
              },
            },
            required: ["jobId", "content"],
          },
        },
      ],
    });
  }

  // ── tools/call ─────────────────────────────────────────────────────────────
  if (method === "tools/call") {
    const params = body.params as { name?: string; arguments?: Record<string, string> };

    if (params?.name !== TOOL_NAME) {
      return err(id, -32601, `Outil inconnu: ${params?.name}`);
    }

    const { jobId, content } = params.arguments ?? {};

    if (!jobId || !content) {
      return err(id, -32602, "jobId et content sont requis");
    }

    console.log(`[mcp] tools/call ${TOOL_NAME}: jobId=${jobId}, content=${content.length} chars`);

    try {
      await setJobResult(jobId, content);
    } catch (e) {
      console.error("[mcp] setJobResult error:", e);
      return err(id, -32603, "Erreur lors du stockage du résultat");
    }

    const response = ok(id, {
      content: [{ type: "text", text: `Résultat stocké (${content.length} chars) pour jobId ${jobId}` }],
      isError: false,
    });
    Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }

  // ── unknown method ─────────────────────────────────────────────────────────
  console.warn(`[mcp] méthode inconnue: ${method}`);
  return err(id, -32601, `Méthode inconnue: ${method}`);
}

import { NextRequest, NextResponse } from "next/server";
import { setJobResult } from "../../lib/jobStore";

type JsonRpcMessage = {
  jsonrpc: "2.0";
  id?: string | number;
  method?: string;
  params?: unknown;
};

export async function POST(req: NextRequest) {
  let body: JsonRpcMessage;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }

  const { id, method } = body;

  // Notifications (no id) — acknowledge without response
  if (id === undefined && method) {
    return new NextResponse(null, { status: 202 });
  }

  if (method === "initialize") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "payfit-mcp", version: "1.0.0" },
      },
    });
  }

  if (method === "tools/list") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "store_result",
            description: "Stocke le résultat généré pour un jobId donné",
            inputSchema: {
              type: "object",
              properties: {
                jobId: { type: "string", description: "L'identifiant du job" },
                content: { type: "string", description: "Le contenu généré à stocker" },
              },
              required: ["jobId", "content"],
            },
          },
        ],
      },
    });
  }

  if (method === "tools/call") {
    const params = body.params as { name: string; arguments: Record<string, string> };

    if (params?.name !== "store_result") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: "Outil inconnu" },
      });
    }

    const { jobId, content } = params.arguments ?? {};

    if (!jobId || !content) {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: "jobId et content sont requis" },
      });
    }

    try {
      await setJobResult(jobId, content);
    } catch (e) {
      console.error("[mcp store_result]", e);
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: "Erreur interne lors du stockage" },
      });
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: "Résultat stocké avec succès" }],
        isError: false,
      },
    });
  }

  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: "Méthode inconnue" },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getClaudeSeoAgent } from "../../lib/claudeSeoAgents";

export const maxDuration = 60;

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

interface AnthropicTextBlock {
  type: "text";
  text: string;
}

interface AnthropicResponse {
  content?: AnthropicTextBlock[];
  error?: {
    message?: string;
  };
}

function normalizeUrl(input: string) {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  return new URL(withProtocol).toString();
}

export async function POST(req: NextRequest) {
  const { agentId, url } = (await req.json().catch(() => ({}))) as {
    agentId?: string;
    url?: string;
  };

  const agent = agentId ? getClaudeSeoAgent(agentId) : null;
  if (!agent) {
    return NextResponse.json({ error: "Unknown SEO agent." }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ error: "A URL is required." }, { status: 400 });
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeUrl(url);
  } catch {
    return NextResponse.json({ error: "The submitted URL is invalid." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing ANTHROPIC_API_KEY. Add it in Vercel Project Settings > Environment Variables.",
      },
      { status: 500 },
    );
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1800,
      system: agent.systemPrompt,
      messages: [
        {
          role: "user",
          content: `Run the "${agent.label}" analysis for this URL: ${normalizedUrl}`,
        },
      ],
    }),
  });

  const data = (await response.json().catch(() => ({}))) as AnthropicResponse;

  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message || "Anthropic API request failed." },
      { status: response.status },
    );
  }

  const result =
    data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n\n")
      .trim() || "No text result returned by Claude.";

  return NextResponse.json({
    agent: agent.label,
    model: CLAUDE_MODEL,
    url: normalizedUrl,
    result,
  });
}

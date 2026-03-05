import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const dustEnvVars = [
  "DUST_AGENT_SEO_ARTICLE",
  "DUST_AGENT_SEO_AUDIT",
  "DUST_AGENT_SEO_ANALYZER",
  "DUST_AGENT_BACKLINKS",
  "DUST_AGENT_GEO_REPORT",
];

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");

  // 1. Env var status
  const envStatus = {
    SUPABASE_URL: SUPABASE_URL ? `set (${SUPABASE_URL.substring(0, 30)}...)` : "MISSING",
    SUPABASE_SERVICE_KEY: SUPABASE_SERVICE_KEY ? "set" : "MISSING",
    ...Object.fromEntries(
      dustEnvVars.map((v) => [v, process.env[v] ? "set" : "MISSING"])
    ),
  };

  // 2. Supabase connectivity test
  let supabaseStatus: string;
  let jobs: unknown[] = [];
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    supabaseStatus = "SKIPPED - env vars missing";
  } else {
    try {
      const query = jobId
        ? `${SUPABASE_URL}/rest/v1/dust_jobs?job_id=eq.${encodeURIComponent(jobId)}&select=job_id,result`
        : `${SUPABASE_URL}/rest/v1/dust_jobs?select=job_id,result&limit=10&order=job_id.desc`;

      const res = await fetch(query, {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });

      if (res.ok) {
        jobs = await res.json().catch(() => []);
        supabaseStatus = `OK (HTTP ${res.status})`;
      } else {
        const text = await res.text().catch(() => "");
        supabaseStatus = `ERROR HTTP ${res.status}: ${text.substring(0, 200)}`;
      }
    } catch (e) {
      supabaseStatus = `EXCEPTION: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json({
    env: envStatus,
    supabase: supabaseStatus,
    jobs: jobs.map((j: unknown) => {
      const job = j as { job_id?: string; result?: string };
      return {
        job_id: job.job_id,
        has_result: !!job.result,
        result_preview: job.result ? job.result.substring(0, 100) + "..." : null,
      };
    }),
    mcp_url: `${req.nextUrl.origin}/api/mcp`,
    callback_url: `${req.nextUrl.origin}/api/dust-callback`,
  });
}

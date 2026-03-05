import { NextRequest, NextResponse } from "next/server";
import { setJobResult } from "../../lib/dustJobs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { jobId, result } = body as { jobId?: string; result?: string };

  if (!jobId || !result) {
    return NextResponse.json({ error: "jobId et result sont requis" }, { status: 400 });
  }

  setJobResult(jobId, result);
  return NextResponse.json({ ok: true });
}

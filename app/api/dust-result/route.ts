import { NextRequest, NextResponse } from "next/server";
import { getJobResult, deleteJob } from "../../lib/dustJobs";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId est requis" }, { status: 400 });
  }

  const job = getJobResult(jobId);
  if (!job) {
    return NextResponse.json({ status: "pending" }, { status: 202 });
  }

  deleteJob(jobId);
  return NextResponse.json({ status: "done", result: job.result });
}

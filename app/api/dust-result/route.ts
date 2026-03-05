import { NextRequest, NextResponse } from "next/server";
import { getJobResult, deleteJob } from "../../lib/jobStore";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId est requis" }, { status: 400 });
  }

  try {
    const result = await getJobResult(jobId);
    if (!result) {
      return NextResponse.json({ status: "pending" }, { status: 202 });
    }
    await deleteJob(jobId);
    return NextResponse.json({ status: "done", result });
  } catch (e) {
    console.error("[dust-result]", e);
    return NextResponse.json({ status: "pending" }, { status: 202 });
  }
}

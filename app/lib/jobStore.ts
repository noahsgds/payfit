const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const headers = () => ({
  "Content-Type": "application/json",
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
});

export async function setJobResult(jobId: string, result: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("[jobStore] setJobResult: SUPABASE_URL ou SUPABASE_SERVICE_KEY non configuré");
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/dust_jobs`, {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ job_id: jobId, result }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[jobStore] setJobResult HTTP ${res.status}: ${text}`);
  }
}

export async function getJobResult(jobId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("[jobStore] getJobResult: SUPABASE_URL ou SUPABASE_SERVICE_KEY non configuré");
    return null;
  }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/dust_jobs?job_id=eq.${encodeURIComponent(jobId)}&select=result`,
    { headers: headers() }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[jobStore] getJobResult HTTP ${res.status}: ${text}`);
    return null;
  }
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0 ? rows[0].result : null;
}

export async function deleteJob(jobId: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  await fetch(
    `${SUPABASE_URL}/rest/v1/dust_jobs?job_id=eq.${encodeURIComponent(jobId)}`,
    { method: "DELETE", headers: headers() }
  );
}

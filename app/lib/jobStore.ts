const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── In-memory fallback (dev / no Supabase) ────────────────────────────────────
// Works in long-running processes (local dev). In serverless production, use Supabase.
const memStore = new Map<string, string>();

const headers = () => ({
  "Content-Type": "application/json",
  apikey: SUPABASE_SERVICE_KEY!,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
});

export async function setJobResult(jobId: string, result: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log(`[jobStore] mem.set ${jobId} (${result.length} chars)`);
    memStore.set(jobId, result);
    return;
  }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/dust_jobs?on_conflict=job_id`,
    {
      method: "POST",
      headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ job_id: jobId, result }),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[jobStore] setJobResult HTTP ${res.status}: ${text}`);
  } else {
    console.log(`[jobStore] supabase.set ${jobId}`);
  }
}

export async function getJobResult(jobId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    const val = memStore.get(jobId) ?? null;
    console.log(`[jobStore] mem.get ${jobId} → ${val ? "found" : "null"}`);
    return val;
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
  const val = Array.isArray(rows) && rows.length > 0 ? rows[0].result : null;
  console.log(`[jobStore] supabase.get ${jobId} → ${val ? "found" : "null"}`);
  return val;
}

export async function deleteJob(jobId: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    memStore.delete(jobId);
    return;
  }
  await fetch(
    `${SUPABASE_URL}/rest/v1/dust_jobs?job_id=eq.${encodeURIComponent(jobId)}`,
    { method: "DELETE", headers: headers() }
  );
}

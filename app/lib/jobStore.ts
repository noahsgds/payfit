import { kv } from "@vercel/kv";

const KEY_PREFIX = "dust_job:";
const TTL_SECONDS = 3600; // 1 heure

export async function setJobResult(jobId: string, result: string): Promise<void> {
  await kv.set(`${KEY_PREFIX}${jobId}`, result, { ex: TTL_SECONDS });
}

export async function getJobResult(jobId: string): Promise<string | null> {
  return kv.get<string>(`${KEY_PREFIX}${jobId}`);
}

export async function deleteJob(jobId: string): Promise<void> {
  await kv.del(`${KEY_PREFIX}${jobId}`);
}

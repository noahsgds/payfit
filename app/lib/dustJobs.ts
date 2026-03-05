// In-memory job store for Dust callback results.
// Shared across requests within the same server process.

interface JobEntry {
  result: string;
  createdAt: number;
}

// globalThis ensures a single instance across Next.js hot-reloads in dev.
const g = globalThis as typeof globalThis & { __dustJobs?: Map<string, JobEntry> };
if (!g.__dustJobs) g.__dustJobs = new Map();
const jobs = g.__dustJobs;

// Auto-purge entries older than 10 minutes every 2 minutes.
setInterval(() => {
  const cutoff = Date.now() - 10 * 60_000;
  for (const [id, entry] of jobs) {
    if (entry.createdAt < cutoff) jobs.delete(id);
  }
}, 2 * 60_000);

export function setJobResult(jobId: string, result: string): void {
  jobs.set(jobId, { result, createdAt: Date.now() });
}

export function getJobResult(jobId: string): JobEntry | null {
  return jobs.get(jobId) ?? null;
}

export function deleteJob(jobId: string): void {
  jobs.delete(jobId);
}

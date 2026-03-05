/**
 * Déclenche l'agent Dust via le webhook d'automation.
 * Le webhook Dust reçoit { jobId, message } et transmet à l'agent.
 * L'agent renvoie le résultat via le MCP tool store_result(jobId, content).
 */
export async function triggerDustAgent(jobId: string, message: string, webhookEnvVar: string): Promise<void> {
  const webhookUrl = process.env[webhookEnvVar];
  if (!webhookUrl) throw new Error(`${webhookEnvVar} non configuré`);

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, message }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Dust webhook error ${res.status}: ${text}`);
  }
}

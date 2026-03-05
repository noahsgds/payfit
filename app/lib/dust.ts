/**
 * Déclenche l'agent Dust via le webhook d'automation.
 * Le webhook Dust reçoit { jobId, message } et transmet à l'agent.
 * L'agent renvoie le résultat via le MCP tool store_result(jobId, content).
 */
export async function triggerDustAgent(jobId: string, message: string): Promise<void> {
  const webhookUrl = process.env.DUST_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("DUST_WEBHOOK_URL non configuré");

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

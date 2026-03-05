const DUST_WORKSPACE_ID = "vTiqcjUPSf";
const DUST_AGENT_ID = "pDpPKsFzPE";

/**
 * Crée une conversation Dust et déclenche l'agent avec le message donné.
 * L'agent utilisera le MCP tool store_result(jobId, content) pour renvoyer le résultat.
 */
export async function triggerDustAgent(jobId: string, message: string): Promise<void> {
  const apiKey = process.env.DUST_API_KEY;
  if (!apiKey) throw new Error("DUST_API_KEY non configuré");

  const res = await fetch(
    `https://dust.tt/api/v1/w/${DUST_WORKSPACE_ID}/assistant/conversations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        visibility: "unlisted",
        title: `job:${jobId}`,
        message: {
          content: `[jobId:${jobId}]\n\n${message}`,
          mentions: [{ configurationId: DUST_AGENT_ID }],
          context: {
            timezone: "Europe/Paris",
            username: "payfit-app",
            fullName: "PayFit App",
            email: null,
            profilePictureUrl: null,
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Dust API error ${res.status}: ${text}`);
  }
}

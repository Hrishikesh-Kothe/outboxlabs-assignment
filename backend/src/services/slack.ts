import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

export function slackConfigured(): boolean {
  return Boolean(env.slackClientId && env.slackClientSecret);
}

export function slackAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.slackClientId,
    scope: "incoming-webhook,chat:write",
    redirect_uri: env.slackCallbackUrl,
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeSlackCode(code: string) {
  const body = new URLSearchParams({
    client_id: env.slackClientId,
    client_secret: env.slackClientSecret,
    code,
    redirect_uri: env.slackCallbackUrl,
  });

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await response.json()) as {
    ok: boolean;
    error?: string;
    access_token?: string;
    team?: { name?: string };
    incoming_webhook?: { url?: string; channel?: string };
  };

  if (!data.ok || !data.access_token) {
    throw new Error(data.error ?? "Slack OAuth failed");
  }

  return {
    accessToken: data.access_token,
    webhookUrl: data.incoming_webhook?.url ?? null,
    teamName: data.team?.name ?? data.incoming_webhook?.channel ?? "Slack",
  };
}

export async function notifyRateLimit(input: {
  userId: string;
  senderEmail: string;
  limit: number;
  hour: string;
}): Promise<void> {
  const connection = await prisma.slackConnection.findUnique({
    where: { userId: input.userId },
  });

  if (!connection) {
    return;
  }

  const text = `ONG rate limit hit for sender ${input.senderEmail}: ${input.limit} emails/hour (window ${input.hour} UTC). Remaining jobs were delayed to the next hour — nothing was dropped.`;

  try {
    if (connection.webhookUrl) {
      await fetch(connection.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      return;
    }

    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: "general", text }),
    });
  } catch (error) {
    console.warn("Slack notify failed (ignored):", error);
  }
}

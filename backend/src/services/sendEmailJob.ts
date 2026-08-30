import { prisma } from "../lib/prisma.js";
import { sendEmail } from "./mailer.js";
import {
  claimRateLimitNotify,
  effectiveHourlyLimit,
  msUntilNextUtcHour,
  reserveSenderSlot,
} from "./rateLimit.js";
import { notifyRateLimit } from "./slack.js";
import { indexEmailRow } from "./indexEmailRow.js";

export type ProcessResult =
  | { kind: "skipped" }
  | { kind: "sent" }
  | { kind: "deferred"; delayMs: number };

export async function processEmailJob(
  emailJobId: string,
): Promise<ProcessResult> {
  const row = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
    include: { campaign: { include: { sender: true } } },
  });

  if (!row) {
    return { kind: "skipped" };
  }

  if (row.status === "sent") {
    return { kind: "skipped" };
  }

  const limit = effectiveHourlyLimit(row.campaign.hourlyLimit);
  const slot = await reserveSenderSlot(row.campaign.senderId, limit);

  if (!slot.allowed) {
    const delayed = await prisma.emailJob.update({
      where: { id: row.id },
      data: { status: "delayed" },
    });
    await indexEmailRow({ ...delayed, campaign: row.campaign });

    if (await claimRateLimitNotify(row.campaign.senderId, slot.hour)) {
      await notifyRateLimit({
        userId: row.campaign.userId,
        senderEmail: row.campaign.sender.email,
        limit,
        hour: slot.hour,
      });
    }

    const delayMs =
      msUntilNextUtcHour() + (row.scheduledAt.getTime() % 60_000);
    return { kind: "deferred", delayMs };
  }

  await prisma.emailJob.update({
    where: { id: row.id },
    data: { status: "sending" },
  });

  try {
    const result = await sendEmail({
      sender: row.campaign.sender,
      to: row.recipient,
      subject: row.campaign.subject,
      html: row.campaign.body,
    });

    const sent = await prisma.emailJob.update({
      where: { id: row.id },
      data: {
        status: "sent",
        sentAt: new Date(),
        error: result.previewUrl ? `preview:${result.previewUrl}` : null,
      },
    });
    await indexEmailRow({ ...sent, campaign: row.campaign });

    if (result.previewUrl) {
      console.log(`Sent ${row.recipient} → ${result.previewUrl}`);
    }
    return { kind: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    const failed = await prisma.emailJob.update({
      where: { id: row.id },
      data: { status: "failed", error: message },
    });
    await indexEmailRow({ ...failed, campaign: row.campaign });
    throw error;
  }
}

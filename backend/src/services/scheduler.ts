import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { enqueueEmailJob } from "../queues/emailQueue.js";
import { indexEmailRow } from "./indexEmailRow.js";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function normalizeRecipients(raw: string[]): string[] {
  const unique = new Set<string>();
  for (const value of raw) {
    const matches = value.match(EMAIL_RE) ?? [];
    for (const email of matches) {
      unique.add(email.toLowerCase());
    }
  }
  return [...unique];
}

export async function scheduleCampaign(input: {
  userId: string;
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: Date;
  delayMs: number;
  hourlyLimit: number;
}) {
  const recipients = normalizeRecipients(input.recipients);
  if (recipients.length === 0) {
    throw new Error("No valid email addresses");
  }

  const sender = await prisma.sender.findFirst({
    where: { id: input.senderId, userId: input.userId },
  });
  if (!sender) {
    throw new Error("Sender not found");
  }

  const campaign = await prisma.campaign.create({
    data: {
      userId: input.userId,
      senderId: sender.id,
      subject: input.subject,
      body: input.body,
      startTime: input.startTime,
      delayMs: input.delayMs,
      hourlyLimit: input.hourlyLimit,
    },
  });

  const jobs = [];
  for (const [index, recipient] of recipients.entries()) {
    const scheduledAt = new Date(
      input.startTime.getTime() + index * input.delayMs,
    );

    try {
      const emailJob = await prisma.emailJob.create({
        data: {
          campaignId: campaign.id,
          recipient,
          scheduledAt,
        },
      });

      await enqueueEmailJob(emailJob.id, scheduledAt);
      const queued = await prisma.emailJob.update({
        where: { id: emailJob.id },
        data: { bullmqJobId: emailJob.id },
      });
      await indexEmailRow({ ...queued, campaign });
      jobs.push(queued);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }

  return { campaign, count: jobs.length };
}

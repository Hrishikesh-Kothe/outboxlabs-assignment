import { Queue } from "bullmq";
import { redis } from "../lib/redis.js";

export const EMAIL_QUEUE_NAME = "email-send";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 200,
    removeOnFail: 200,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

export async function enqueueEmailJob(
  emailJobId: string,
  scheduledAt: Date,
): Promise<void> {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  await emailQueue.add(
    "send",
    { emailJobId },
    { jobId: emailJobId, delay },
  );
}

export async function hasQueueJob(emailJobId: string): Promise<boolean> {
  const job = await emailQueue.getJob(emailJobId);
  return Boolean(job);
}

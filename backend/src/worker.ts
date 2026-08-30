import { DelayedError, Worker } from "bullmq";
import { env } from "./config/env.js";
import { ensureRedisReady } from "./lib/redis.js";
import { redis } from "./lib/redis.js";
import { EMAIL_QUEUE_NAME } from "./queues/emailQueue.js";
import { reconcileMissingJobs } from "./services/reconcile.js";
import { processEmailJob } from "./services/sendEmailJob.js";

async function start() {
  await ensureRedisReady();

  await reconcileMissingJobs();

  const worker = new Worker<{ emailJobId: string }>(
    EMAIL_QUEUE_NAME,
    async (job, token) => {
      const result = await processEmailJob(job.data.emailJobId);
      if (result.kind === "deferred") {
        await job.moveToDelayed(Date.now() + result.delayMs, token);
        throw new DelayedError();
      }
    },
    {
      connection: redis,
      concurrency: env.workerConcurrency,
      limiter: {
        max: 1,
        duration: env.minDelayMs,
      },
    },
  );

  worker.on("failed", (job, error) => {
    if (error.message === "DelayedError" || error.name === "DelayedError") {
      return;
    }
    console.error(`Job ${job?.id} failed:`, error.message);
  });

  console.log(
    `Worker listening on ${EMAIL_QUEUE_NAME} (concurrency=${env.workerConcurrency}, minDelay=${env.minDelayMs}ms)`,
  );
}

void start();

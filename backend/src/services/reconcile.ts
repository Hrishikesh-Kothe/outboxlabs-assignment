import { prisma } from "../lib/prisma.js";
import { enqueueEmailJob, hasQueueJob } from "../queues/emailQueue.js";

// After an API/worker restart: MySQL still has scheduled rows.
// If Redis lost the delayed job, put it back. Never re-queue sent mail.
export async function reconcileMissingJobs(): Promise<number> {
  const pending = await prisma.emailJob.findMany({
    where: { status: { in: ["scheduled", "delayed"] } },
  });

  let restored = 0;
  for (const row of pending) {
    if (await hasQueueJob(row.id)) {
      continue;
    }
    await enqueueEmailJob(row.id, row.scheduledAt);
    await prisma.emailJob.update({
      where: { id: row.id },
      data: { bullmqJobId: row.id },
    });
    restored += 1;
  }

  if (restored > 0) {
    console.log(`Reconcile: restored ${restored} missing queue jobs`);
  }
  return restored;
}

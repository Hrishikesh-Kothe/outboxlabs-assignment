import { Router } from "express";
import type { EmailStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { searchEmailIds } from "../services/elasticsearch.js";

export const emailsRouter = Router();

emailsRouter.use(requireAuth);

const SCHEDULED: EmailStatus[] = ["scheduled", "delayed", "sending"];
const SENT: EmailStatus[] = ["sent", "failed"];

function statusesFor(status?: string): EmailStatus[] | undefined {
  if (status === "scheduled") {
    return SCHEDULED;
  }
  if (status === "sent") {
    return SENT;
  }
  return undefined;
}

emailsRouter.get("/api/emails/counts", async (req, res) => {
  const userId = req.user!.id;
  const [scheduled, sent] = await Promise.all([
    prisma.emailJob.count({
      where: { campaign: { userId }, status: { in: SCHEDULED } },
    }),
    prisma.emailJob.count({
      where: { campaign: { userId }, status: { in: SENT } },
    }),
  ]);
  res.json({ scheduled, sent });
});

emailsRouter.get("/api/emails", async (req, res) => {
  const status = req.query.status as string | undefined;
  const q = String(req.query.q ?? "").trim();
  const statusFilter = statusesFor(status);
  let idFilter: string[] | undefined;

  if (q) {
    const ids = await searchEmailIds({
      userId: req.user!.id,
      q,
      statuses: statusFilter,
    });
    if (ids) {
      idFilter = ids;
    }
  }

  if (idFilter && idFilter.length === 0) {
    res.json([]);
    return;
  }

  const emails = await prisma.emailJob.findMany({
    where: {
      campaign: { userId: req.user!.id },
      ...(statusFilter ? { status: { in: statusFilter } } : {}),
      ...(idFilter
        ? { id: { in: idFilter } }
        : q
          ? {
              OR: [
                { recipient: { contains: q } },
                { campaign: { subject: { contains: q } } },
                { campaign: { body: { contains: q } } },
              ],
            }
          : {}),
    },
    include: {
      campaign: {
        select: { subject: true, body: true, sender: { select: { email: true } } },
      },
    },
    orderBy: { scheduledAt: "desc" },
    take: 100,
  });

  res.json(
    emails.map((email) => ({
      id: email.id,
      recipient: email.recipient,
      subject: email.campaign.subject,
      snippet: email.campaign.body.replace(/<[^>]+>/g, "").slice(0, 120),
      status: email.status,
      scheduledAt: email.scheduledAt,
      sentAt: email.sentAt,
      from: email.campaign.sender.email,
    })),
  );
});

emailsRouter.get("/api/emails/:id", async (req, res) => {
  const email = await prisma.emailJob.findFirst({
    where: { id: req.params.id, campaign: { userId: req.user!.id } },
    include: {
      campaign: {
        include: { sender: { select: { email: true } } },
      },
    },
  });

  if (!email) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({
    id: email.id,
    recipient: email.recipient,
    subject: email.campaign.subject,
    body: email.campaign.body,
    status: email.status,
    scheduledAt: email.scheduledAt,
    sentAt: email.sentAt,
    from: email.campaign.sender.email,
    error: email.error,
  });
});

import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { createEtherealSender } from "../services/mailer.js";

export const sendersRouter = Router();

sendersRouter.use(requireAuth);

sendersRouter.get("/api/senders", async (req, res) => {
  const senders = await prisma.sender.findMany({
    where: { userId: req.user!.id },
    select: { id: true, email: true, smtpHost: true, smtpPort: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(senders);
});

sendersRouter.post("/api/senders", async (req, res) => {
  const data = await createEtherealSender(req.user!.id);
  const sender = await prisma.sender.create({ data });
  res.status(201).json({
    id: sender.id,
    email: sender.email,
    smtpHost: sender.smtpHost,
    smtpPort: sender.smtpPort,
  });
});

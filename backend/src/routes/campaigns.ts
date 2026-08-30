import { Router } from "express";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { scheduleCampaign } from "../services/scheduler.js";

export const campaignsRouter = Router();

campaignsRouter.use(requireAuth);

campaignsRouter.post("/api/campaigns", async (req, res) => {
  try {
    const subject = String(req.body.subject ?? "").trim();
    const body = String(req.body.body ?? "").trim();
    const recipients = Array.isArray(req.body.recipients)
      ? req.body.recipients.map(String)
      : [];
    const startTime = req.body.startTime
      ? new Date(req.body.startTime)
      : new Date();
    const delayMs = Number(req.body.delayMs ?? env.minDelayMs);
    const hourlyLimit = Number(
      req.body.hourlyLimit ?? env.maxEmailsPerHourPerSender,
    );
    const senderId = String(req.body.senderId ?? "");

    if (!subject || !body || !senderId) {
      res.status(400).json({ error: "subject, body, and senderId are required" });
      return;
    }

    const result = await scheduleCampaign({
      userId: req.user!.id,
      senderId,
      subject,
      body,
      recipients,
      startTime,
      delayMs: Number.isFinite(delayMs) ? delayMs : env.minDelayMs,
      hourlyLimit: Number.isFinite(hourlyLimit)
        ? hourlyLimit
        : env.maxEmailsPerHourPerSender,
    });

    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Schedule failed";
    res.status(400).json({ error: message });
  }
});

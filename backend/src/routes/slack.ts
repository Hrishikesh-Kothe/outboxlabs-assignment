import { randomBytes } from "node:crypto";
import { Router } from "express";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  exchangeSlackCode,
  slackAuthorizeUrl,
  slackConfigured,
} from "../services/slack.js";

export const slackRouter = Router();

slackRouter.get("/auth/slack", requireAuth, (req, res) => {
  if (!slackConfigured()) {
    res.status(503).json({
      error: "Slack OAuth is not configured",
      hint: "Create a Slack app with incoming-webhook + chat:write. Redirect URL: http://localhost:4000/auth/slack/callback. Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET.",
    });
    return;
  }

  const state = randomBytes(16).toString("hex");
  req.session.slackState = state;
  req.session.save((error) => {
    if (error) {
      res.status(500).json({ error: "Could not start Slack OAuth" });
      return;
    }
    res.redirect(slackAuthorizeUrl(state));
  });
});

slackRouter.get("/auth/slack/callback", requireAuth, async (req, res) => {
  const code = String(req.query.code ?? "");
  const state = String(req.query.state ?? "");

  if (!code || !state || state !== req.session.slackState) {
    res.redirect(`${env.frontendUrl}/inbox?slack=denied`);
    return;
  }

  req.session.slackState = undefined;

  try {
    const tokens = await exchangeSlackCode(code);
    await prisma.slackConnection.upsert({
      where: { userId: req.user!.id },
      update: tokens,
      create: { userId: req.user!.id, ...tokens },
    });
    res.redirect(`${env.frontendUrl}/inbox?slack=connected`);
  } catch {
    res.redirect(`${env.frontendUrl}/inbox?slack=error`);
  }
});

slackRouter.get("/api/slack", requireAuth, async (req, res) => {
  const connection = await prisma.slackConnection.findUnique({
    where: { userId: req.user!.id },
    select: { teamName: true },
  });
  res.json({
    connected: Boolean(connection),
    teamName: connection?.teamName ?? null,
  });
});

slackRouter.delete("/api/slack", requireAuth, async (req, res) => {
  await prisma.slackConnection.deleteMany({ where: { userId: req.user!.id } });
  res.json({ connected: false });
});

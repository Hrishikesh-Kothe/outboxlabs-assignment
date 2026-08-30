import cors from "cors";
import express from "express";
import passport from "passport";
import { setupPassport } from "./auth/passport.js";
import { setupSession } from "./auth/session.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { ensureRedisReady, redis } from "./lib/redis.js";
import { authRouter } from "./routes/auth.js";
import { campaignsRouter } from "./routes/campaigns.js";
import { emailsRouter } from "./routes/emails.js";
import { sendersRouter } from "./routes/senders.js";
import { slackRouter } from "./routes/slack.js";
import { createQueueDashboard } from "./lib/bullBoard.js";
import { ensureEmailIndex } from "./services/elasticsearch.js";
import { reconcileMissingJobs } from "./services/reconcile.js";

setupPassport();

const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  }),
);
app.use(express.json());
setupSession(app);
app.use(passport.initialize());
app.use(passport.session());

app.get("/api/health", async (_req, res) => {
  const checks = {
    mysql: false,
    redis: false,
    elasticsearch: false,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.mysql = true;
  } catch {
    checks.mysql = false;
  }

  try {
    await ensureRedisReady();
    checks.redis = (await redis.ping()) === "PONG";
  } catch {
    checks.redis = false;
  }

  try {
    const response = await fetch(`${env.elasticsearchUrl}/_cluster/health`);
    checks.elasticsearch = response.ok;
  } catch {
    checks.elasticsearch = false;
  }

  const ok = checks.mysql && checks.redis && checks.elasticsearch;
  res.status(ok ? 200 : 503).json({ ok, ...checks });
});

app.use(authRouter);
app.use(slackRouter);
app.use(sendersRouter);
app.use(campaignsRouter);
app.use(emailsRouter);
app.use("/admin/queues", createQueueDashboard());

async function start() {
  try {
    await ensureRedisReady();
    await reconcileMissingJobs();
    await ensureEmailIndex();
  } catch (error) {
    console.warn(
      "Startup extras skipped — start Docker, then restart the API",
      error,
    );
  }

  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

void start();

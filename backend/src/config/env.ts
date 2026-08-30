import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env") });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing env var ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-only-change-me",
  databaseUrl: required("DATABASE_URL"),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  elasticsearchUrl: process.env.ELASTICSEARCH_URL ?? "http://localhost:9200",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ??
    "http://localhost:4000/auth/google/callback",
  slackClientId: process.env.SLACK_CLIENT_ID ?? "",
  slackClientSecret: process.env.SLACK_CLIENT_SECRET ?? "",
  slackCallbackUrl:
    process.env.SLACK_CALLBACK_URL ??
    "http://localhost:4000/auth/slack/callback",
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY ?? 4),
  minDelayMs: Number(process.env.MIN_DELAY_MS ?? 2000),
  maxEmailsPerHourPerSender: Number(
    process.env.MAX_EMAILS_PER_HOUR_PER_SENDER ?? 60,
  ),
};

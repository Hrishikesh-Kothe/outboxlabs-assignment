import { env } from "../config/env.js";
import { redis } from "../lib/redis.js";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function utcHourKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}-${pad(date.getUTCHours())}`;
}

export function msUntilNextUtcHour(date = new Date()): number {
  const next = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours() + 1,
    0,
    0,
    0,
  );
  return Math.max(1000, next - date.getTime());
}

export function effectiveHourlyLimit(campaignLimit: number): number {
  if (!Number.isFinite(campaignLimit) || campaignLimit <= 0) {
    return env.maxEmailsPerHourPerSender;
  }
  return Math.min(campaignLimit, env.maxEmailsPerHourPerSender);
}

// Atomic enough across workers: INCR then DECR if over the cap.
// Key is sender + UTC hour so two API instances share the same count.
export async function reserveSenderSlot(
  senderId: string,
  limit: number,
): Promise<{ allowed: boolean; count: number; hour: string }> {
  const hour = utcHourKey();
  const key = `rate:${senderId}:${hour}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 3700);
  }

  if (count > limit) {
    await redis.decr(key);
    return { allowed: false, count: count - 1, hour };
  }

  return { allowed: true, count, hour };
}

export async function claimRateLimitNotify(
  senderId: string,
  hour: string,
): Promise<boolean> {
  const result = await redis.set(
    `notify:${senderId}:${hour}`,
    "1",
    "EX",
    3700,
    "NX",
  );
  return result === "OK";
}

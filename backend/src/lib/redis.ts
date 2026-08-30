import Redis from "ioredis";
import { env } from "../config/env.js";

export function createRedis(): Redis {
  return new Redis(env.redisUrl, {
    maxRetriesPerRequest: null,
  });
}

export const redis = createRedis();

export async function ensureRedisReady(): Promise<void> {
  if (redis.status === "ready") {
    return;
  }
  if (redis.status === "wait") {
    await redis.connect();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      redis.off("error", onError);
      resolve();
    };
    const onError = (error: Error) => {
      redis.off("ready", onReady);
      reject(error);
    };
    redis.once("ready", onReady);
    redis.once("error", onError);
  });
}

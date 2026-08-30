import type { SessionData } from "express-session";
import type { Express } from "express";
import session from "express-session";
import { env } from "../config/env.js";
import { createRedis } from "../lib/redis.js";

const PREFIX = "ong:sess:";
const sessionRedis = createRedis();

class IoRedisStore extends session.Store {
  get(sid: string, callback: (err?: unknown, session?: SessionData | null) => void) {
    sessionRedis
      .get(PREFIX + sid)
      .then((raw) => callback(undefined, raw ? (JSON.parse(raw) as SessionData) : null))
      .catch(callback);
  }

  set(sid: string, sess: SessionData, callback?: (err?: unknown) => void) {
    const ttlMs = sess.cookie.maxAge ?? 7 * 24 * 60 * 60 * 1000;
    const ttlSec = Math.max(60, Math.ceil(ttlMs / 1000));
    sessionRedis
      .set(PREFIX + sid, JSON.stringify(sess), "EX", ttlSec)
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }

  destroy(sid: string, callback?: (err?: unknown) => void) {
    sessionRedis
      .del(PREFIX + sid)
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }
}

export function setupSession(app: Express): void {
  app.set("trust proxy", 1);
  app.use(
    session({
      name: "ong.sid",
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: new IoRedisStore(),
      cookie: {
        httpOnly: true,
        // Cross-origin frontend + API requires SameSite=None and Secure.
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );
}

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

export function googleConfigured(): boolean {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

export function setupPassport(): void {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user ?? false);
    } catch (error) {
      done(error);
    }
  });

  if (!googleConfigured()) {
    console.warn(
      "Google OAuth skipped: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env",
    );
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.googleClientId,
        clientSecret: env.googleClientSecret,
        callbackURL: env.googleCallbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            done(new Error("Google account has no email"));
            return;
          }

          const user = await prisma.user.upsert({
            where: { googleId: profile.id },
            update: {
              name: profile.displayName,
              email,
              avatar: profile.photos?.[0]?.value ?? null,
            },
            create: {
              googleId: profile.id,
              name: profile.displayName,
              email,
              avatar: profile.photos?.[0]?.value ?? null,
            },
          });

          done(null, user);
        } catch (error) {
          done(error);
        }
      },
    ),
  );
}

import { Router } from "express";
import passport from "passport";
import { googleConfigured } from "../auth/passport.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

authRouter.get("/auth/google", (req, res, next) => {
  if (!googleConfigured()) {
    res.status(503).json({
      error: "Google OAuth is not configured",
      hint: "Create a Web client in Google Cloud Console. Authorized redirect URI must be http://localhost:4000/auth/google/callback. Then set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env",
    });
    return;
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(
    req,
    res,
    next,
  );
});

authRouter.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${env.frontendUrl}/?error=google`,
  }),
  (_req, res) => {
    res.redirect(`${env.frontendUrl}/inbox`);
  },
);

authRouter.get("/auth/logout", (req, res, next) => {
  req.logout((logoutError) => {
    if (logoutError) {
      next(logoutError);
      return;
    }
    req.session.destroy((sessionError) => {
      if (sessionError) {
        next(sessionError);
        return;
      }
      res.clearCookie("ong.sid");
      res.redirect(env.frontendUrl);
    });
  });
});

authRouter.get("/api/me", requireAuth, async (req, res) => {
  const user = req.user!;
  const slack = await prisma.slackConnection.findUnique({
    where: { userId: user.id },
    select: { teamName: true },
  });
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    slackConnected: Boolean(slack),
    slackTeamName: slack?.teamName ?? null,
  });
});

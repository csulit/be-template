import { createMiddleware } from "hono/factory";
import { auth, type Session } from "../lib/auth.js";
import { prisma } from "../db.js";
import { Forbidden, Unauthorized } from "../lib/errors.js";

export type AuthEnv = {
  Variables: {
    user: Session["user"];
    session: Session["session"];
  };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  // Try cookie-based session first (standard better-auth flow)
  let session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  // Fallback: resolve Bearer token directly from the database
  if (!session) {
    const authHeader = c.req.header("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const dbSession = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });

      if (dbSession && dbSession.expiresAt > new Date()) {
        session = {
          session: dbSession as unknown as Session["session"],
          user: dbSession.user as unknown as Session["user"],
        };
      }
    }
  }

  if (!session) {
    throw Unauthorized("Authentication required");
  }

  c.set("user", session.user);
  c.set("session", session.session);

  await next();
});

// Role guard factory
export function roleGuard(...allowedRoles: string[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      throw Unauthorized("Authentication required");
    }

    const userRole = user.role ?? "user";
    if (!allowedRoles.includes(userRole)) {
      throw Forbidden("Insufficient permissions");
    }

    await next();
  });
}

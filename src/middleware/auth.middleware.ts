import { createMiddleware } from "hono/factory";
import { auth, type Session } from "../lib/auth.js";
import { Forbidden, Unauthorized } from "../lib/errors.js";

export type AuthEnv = {
  Variables: {
    user: Session["user"];
    session: Session["session"];
  };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

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

import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";

import { env } from "./env.js";
import { auth } from "./lib/auth.js";
import { setupOpenAPI } from "./lib/openapi.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { rateLimiter } from "./middleware/rate-limit.middleware.js";
import { usersRoutes } from "./modules/users/users.route.js";
import { documentsRoutes } from "./modules/documents/documents.route.js";
import { incomingEmailRoutes } from "./modules/incoming-email/incoming-email.route.js";
import { reimbursementRoutes } from "./modules/reimbursement/reimbursement.route.js";

export type AppEnv = {
  Variables: {
    requestId: string;
  };
};

export function createApp() {
  const app = new OpenAPIHono<AppEnv>();

  // Security headers
  app.use(secureHeaders());

  // CORS
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    })
  );

  // Request ID
  app.use(requestId());

  // Logger
  if (env.NODE_ENV !== "test") {
    app.use(logger());
  }

  // Rate limiting
  app.use(rateLimiter({ windowMs: 60_000, limit: 100 }));

  // Global error handler
  app.onError(errorHandler);

  // Health check
  app.get("/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // better-auth handler
  app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

  // API routes
  app.route("/api/users", usersRoutes);
  app.route("/api/documents", documentsRoutes);
  app.route("/api/incoming-emails", incomingEmailRoutes);
  app.route("/api/reimbursement", reimbursementRoutes);

  // OpenAPI documentation
  setupOpenAPI(app);

  return app;
}

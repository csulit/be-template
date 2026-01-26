import { swaggerUI } from "@hono/swagger-ui";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { env } from "../env.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setupOpenAPI(app: OpenAPIHono<any>) {
  // Register Bearer auth security scheme
  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    description: "Session token obtained from /api/auth/sign-in/email or /api/users/dev-token",
  });

  // Serve OpenAPI spec
  app.doc("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "API",
      version: "1.0.0",
      description: "Production-ready API template with Hono and better-auth",
    },
    servers: [
      {
        url: env.BASE_URL,
        description: env.NODE_ENV === "production" ? "Production" : "Development",
      },
    ],
    security: [{ bearerAuth: [] }],
  });

  // Swagger UI (non-production only)
  if (env.NODE_ENV !== "production") {
    app.get("/docs", swaggerUI({ url: "/openapi.json" }));
  }
}

import { swaggerUI } from "@hono/swagger-ui";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { env } from "../env.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setupOpenAPI(app: OpenAPIHono<any>) {
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
  });

  // Swagger UI (non-production only)
  if (env.NODE_ENV !== "production") {
    app.get("/docs", swaggerUI({ url: "/openapi.json" }));
  }
}

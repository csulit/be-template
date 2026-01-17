import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { authMiddleware, type AuthEnv } from "../../middleware/auth.middleware.js";
import { ErrorResponseSchema } from "../../shared/dtos/response.dto.js";
import { incomingEmailController } from "./incoming-email.controller.js";
import {
  IncomingEmailListResponseSchema,
  IncomingEmailSuccessResponseSchema,
} from "./incoming-email.dto.js";
import {
  ListIncomingEmailQuerySchema,
  IncomingEmailParamsSchema,
  UpdateIncomingEmailBodySchema,
} from "./incoming-email.validator.js";

const app = new OpenAPIHono<AuthEnv>();

// GET /api/incoming-emails
const listIncomingEmailsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["IncomingEmail"],
  summary: "List incoming emails",
  description:
    "Returns a paginated list of incoming emails with optional filters by status and sender",
  middleware: [authMiddleware] as const,
  request: {
    query: ListIncomingEmailQuerySchema,
  },
  responses: {
    200: {
      description: "Incoming email list",
      content: {
        "application/json": {
          schema: IncomingEmailListResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /api/incoming-emails/:id
const getIncomingEmailRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["IncomingEmail"],
  summary: "Get incoming email by ID",
  description: "Returns a single incoming email by its ID, including all attachments",
  middleware: [authMiddleware] as const,
  request: {
    params: IncomingEmailParamsSchema,
  },
  responses: {
    200: {
      description: "Incoming email details",
      content: {
        "application/json": {
          schema: IncomingEmailSuccessResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Incoming email not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// PATCH /api/incoming-emails/:id
const updateIncomingEmailRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["IncomingEmail"],
  summary: "Update incoming email",
  description: "Updates an incoming email's status and/or metadata",
  middleware: [authMiddleware] as const,
  request: {
    params: IncomingEmailParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: UpdateIncomingEmailBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Incoming email updated",
      content: {
        "application/json": {
          schema: IncomingEmailSuccessResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Incoming email not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Export route types for controller type safety
export type ListIncomingEmailsRoute = typeof listIncomingEmailsRoute;
export type GetIncomingEmailRoute = typeof getIncomingEmailRoute;
export type UpdateIncomingEmailRoute = typeof updateIncomingEmailRoute;

// Register routes
app.openapi(listIncomingEmailsRoute, incomingEmailController.list);
app.openapi(getIncomingEmailRoute, incomingEmailController.getById);
app.openapi(updateIncomingEmailRoute, incomingEmailController.update);

export { app as incomingEmailRoutes };

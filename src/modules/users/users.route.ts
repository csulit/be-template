import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { authMiddleware, type AuthEnv } from "../../middleware/auth.middleware.js";
import { ErrorResponseSchema } from "../../shared/dtos/response.dto.js";
import { usersController } from "./users.controller.js";
import { UserProfileResponseSchema } from "./users.dto.js";
import { UpdateProfileSchema } from "./users.validator.js";

const app = new OpenAPIHono<AuthEnv>();

// GET /api/users/me
const getProfileRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Users"],
  summary: "Get current user profile",
  description: "Returns the profile of the authenticated user",
  middleware: [authMiddleware] as const,
  responses: {
    200: {
      description: "User profile",
      content: {
        "application/json": {
          schema: UserProfileResponseSchema,
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

// PATCH /api/users/me
const updateProfileRoute = createRoute({
  method: "patch",
  path: "/me",
  tags: ["Users"],
  summary: "Update current user profile",
  description: "Updates the profile of the authenticated user",
  middleware: [authMiddleware] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: UpdateProfileSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated user profile",
      content: {
        "application/json": {
          schema: UserProfileResponseSchema,
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

// Export route types for controller type safety
export type GetProfileRoute = typeof getProfileRoute;
export type UpdateProfileRoute = typeof updateProfileRoute;

// Register routes
app.openapi(getProfileRoute, usersController.getProfile);
app.openapi(updateProfileRoute, usersController.updateProfile);

export { app as usersRoutes };

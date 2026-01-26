import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { orgGuard, type OrgEnv } from "../../middleware/org.middleware.js";
import { ErrorResponseSchema } from "../../shared/dtos/response.dto.js";
import { reimbursementController } from "./reimbursement.controller.js";
import {
  ReimbursementUserResponseSchema,
  ReimbursementUserListResponseSchema,
  ReimbursementTypeResponseSchema,
  ReimbursementTypeListResponseSchema,
  ReimbursementRoleResponseSchema,
  ReimbursementRoleListResponseSchema,
  ReimbursementTypeCategoryResponseSchema,
  ReimbursementTypeCategoryListResponseSchema,
} from "./reimbursement.dto.js";
import {
  CreateReimbursementUserBodySchema,
  UpdateReimbursementUserBodySchema,
  CreateReimbursementTypeBodySchema,
  CreateReimbursementRoleBodySchema,
  CreateReimbursementTypeCategoryBodySchema,
  ReimbursementParamsSchema,
  ListReimbursementQuerySchema,
  ListReimbursementRolesQuerySchema,
  ListReimbursementTypeCategoriesQuerySchema,
  ListReimbursementTypesQuerySchema,
} from "./reimbursement.validator.js";

const app = new OpenAPIHono<OrgEnv>();

const SuccessResponseSchema = z.object({ success: z.literal(true) });

// ============================================================================
// Reimbursement Users Routes
// ============================================================================

const listUsersRoute = createRoute({
  method: "get",
  path: "/users",
  tags: ["Reimbursement User"],
  summary: "List reimbursement users",
  description:
    "Returns a paginated list of reimbursement users with their assigned roles. Optionally filter by role.",
  middleware: [authMiddleware, orgGuard({ source: { from: "query" } })] as const,
  request: {
    query: ListReimbursementQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated list of reimbursement users",
      content: {
        "application/json": {
          schema: ReimbursementUserListResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const getUserRoute = createRoute({
  method: "get",
  path: "/users/{id}",
  tags: ["Reimbursement User"],
  summary: "Get reimbursement user by ID",
  description:
    "Returns a single reimbursement user by its ID, including the associated user details",
  middleware: [
    authMiddleware,
    orgGuard({ source: { from: "resource", table: "reimbursementUser" } }),
  ] as const,
  request: {
    params: ReimbursementParamsSchema,
  },
  responses: {
    200: {
      description: "Reimbursement user details",
      content: {
        "application/json": {
          schema: ReimbursementUserResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Reimbursement user not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const createUserRoute = createRoute({
  method: "post",
  path: "/users",
  tags: ["Reimbursement User"],
  summary: "Create reimbursement user",
  description: "Assigns a reimbursement role to a user. Each user-role combination must be unique.",
  middleware: [
    authMiddleware,
    orgGuard({ source: { from: "body" }, roles: ["admin", "owner"] }),
  ] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateReimbursementUserBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Reimbursement user created",
      content: {
        "application/json": {
          schema: ReimbursementUserResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: "User already has this role assigned",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const updateUserRoute = createRoute({
  method: "patch",
  path: "/users/{id}",
  tags: ["Reimbursement User"],
  summary: "Update reimbursement user",
  description: "Updates the role assignment for an existing reimbursement user",
  middleware: [
    authMiddleware,
    orgGuard({
      source: { from: "resource", table: "reimbursementUser" },
      roles: ["admin", "owner"],
    }),
  ] as const,
  request: {
    params: ReimbursementParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: UpdateReimbursementUserBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Reimbursement user updated",
      content: {
        "application/json": {
          schema: ReimbursementUserResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Reimbursement user not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: "User already has this role assigned",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const deleteUserRoute = createRoute({
  method: "delete",
  path: "/users/{id}",
  tags: ["Reimbursement User"],
  summary: "Delete reimbursement user",
  description: "Removes a reimbursement role assignment from a user",
  middleware: [
    authMiddleware,
    orgGuard({
      source: { from: "resource", table: "reimbursementUser" },
      roles: ["admin", "owner"],
    }),
  ] as const,
  request: {
    params: ReimbursementParamsSchema,
  },
  responses: {
    200: {
      description: "Reimbursement user deleted",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Reimbursement user not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// Reimbursement Types Routes
// ============================================================================

const listTypesRoute = createRoute({
  method: "get",
  path: "/types",
  tags: ["Reimbursement Type"],
  summary: "List reimbursement types",
  description: "Returns a paginated list of reimbursement types. Optionally filter by category.",
  middleware: [authMiddleware, orgGuard({ source: { from: "query" } })] as const,
  request: {
    query: ListReimbursementTypesQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated list of reimbursement types",
      content: {
        "application/json": {
          schema: ReimbursementTypeListResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const getTypeRoute = createRoute({
  method: "get",
  path: "/types/{id}",
  tags: ["Reimbursement Type"],
  summary: "Get reimbursement type by ID",
  description: "Returns a single reimbursement type by its ID",
  middleware: [
    authMiddleware,
    orgGuard({ source: { from: "resource", table: "reimbursementType" } }),
  ] as const,
  request: {
    params: ReimbursementParamsSchema,
  },
  responses: {
    200: {
      description: "Reimbursement type details",
      content: {
        "application/json": {
          schema: ReimbursementTypeResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Reimbursement type not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const createTypeRoute = createRoute({
  method: "post",
  path: "/types",
  tags: ["Reimbursement Type"],
  summary: "Create reimbursement type",
  description: "Creates a new reimbursement type. The name must be unique within the organization.",
  middleware: [
    authMiddleware,
    orgGuard({ source: { from: "body" }, roles: ["admin", "owner"] }),
  ] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateReimbursementTypeBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Reimbursement type created",
      content: {
        "application/json": {
          schema: ReimbursementTypeResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Reimbursement type with this name already exists",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const deleteTypeRoute = createRoute({
  method: "delete",
  path: "/types/{id}",
  tags: ["Reimbursement Type"],
  summary: "Delete reimbursement type",
  description: "Deletes a reimbursement type",
  middleware: [
    authMiddleware,
    orgGuard({
      source: { from: "resource", table: "reimbursementType" },
      roles: ["admin", "owner"],
    }),
  ] as const,
  request: {
    params: ReimbursementParamsSchema,
  },
  responses: {
    200: {
      description: "Reimbursement type deleted",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Reimbursement type not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// Reimbursement Roles Routes
// ============================================================================

const listRolesRoute = createRoute({
  method: "get",
  path: "/roles",
  tags: ["Reimbursement Role"],
  summary: "List reimbursement roles",
  description: "Returns a paginated list of reimbursement roles filtered by organization",
  middleware: [authMiddleware, orgGuard({ source: { from: "query" } })] as const,
  request: {
    query: ListReimbursementRolesQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated list of reimbursement roles",
      content: {
        "application/json": {
          schema: ReimbursementRoleListResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const getRoleRoute = createRoute({
  method: "get",
  path: "/roles/{id}",
  tags: ["Reimbursement Role"],
  summary: "Get reimbursement role by ID",
  description: "Returns a single reimbursement role by its ID",
  middleware: [
    authMiddleware,
    orgGuard({ source: { from: "resource", table: "reimbursementRole" } }),
  ] as const,
  request: {
    params: ReimbursementParamsSchema,
  },
  responses: {
    200: {
      description: "Reimbursement role details",
      content: {
        "application/json": {
          schema: ReimbursementRoleResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Reimbursement role not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const createRoleRoute = createRoute({
  method: "post",
  path: "/roles",
  tags: ["Reimbursement Role"],
  summary: "Create reimbursement role",
  description: "Creates a new reimbursement role. The name must be unique within the organization.",
  middleware: [
    authMiddleware,
    orgGuard({ source: { from: "body" }, roles: ["admin", "owner"] }),
  ] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateReimbursementRoleBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Reimbursement role created",
      content: {
        "application/json": {
          schema: ReimbursementRoleResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Reimbursement role with this name already exists in the organization",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const deleteRoleRoute = createRoute({
  method: "delete",
  path: "/roles/{id}",
  tags: ["Reimbursement Role"],
  summary: "Delete reimbursement role",
  description: "Deletes a reimbursement role",
  middleware: [
    authMiddleware,
    orgGuard({
      source: { from: "resource", table: "reimbursementRole" },
      roles: ["admin", "owner"],
    }),
  ] as const,
  request: {
    params: ReimbursementParamsSchema,
  },
  responses: {
    200: {
      description: "Reimbursement role deleted",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Reimbursement role not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// Reimbursement Type Categories Routes
// ============================================================================

const listTypeCategoriesRoute = createRoute({
  method: "get",
  path: "/type-categories",
  tags: ["Reimbursement Type Category"],
  summary: "List reimbursement type categories",
  description: "Returns a paginated list of reimbursement type categories filtered by organization",
  middleware: [authMiddleware, orgGuard({ source: { from: "query" } })] as const,
  request: {
    query: ListReimbursementTypeCategoriesQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated list of reimbursement type categories",
      content: {
        "application/json": {
          schema: ReimbursementTypeCategoryListResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const getTypeCategoryRoute = createRoute({
  method: "get",
  path: "/type-categories/{id}",
  tags: ["Reimbursement Type Category"],
  summary: "Get reimbursement type category by ID",
  description: "Returns a single reimbursement type category by its ID",
  middleware: [
    authMiddleware,
    orgGuard({ source: { from: "resource", table: "reimbursementTypeCategory" } }),
  ] as const,
  request: {
    params: ReimbursementParamsSchema,
  },
  responses: {
    200: {
      description: "Reimbursement type category details",
      content: {
        "application/json": {
          schema: ReimbursementTypeCategoryResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Reimbursement type category not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const createTypeCategoryRoute = createRoute({
  method: "post",
  path: "/type-categories",
  tags: ["Reimbursement Type Category"],
  summary: "Create reimbursement type category",
  description:
    "Creates a new reimbursement type category. The name must be unique within the organization.",
  middleware: [
    authMiddleware,
    orgGuard({ source: { from: "body" }, roles: ["admin", "owner"] }),
  ] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateReimbursementTypeCategoryBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Reimbursement type category created",
      content: {
        "application/json": {
          schema: ReimbursementTypeCategoryResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Reimbursement type category with this name already exists in the organization",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const deleteTypeCategoryRoute = createRoute({
  method: "delete",
  path: "/type-categories/{id}",
  tags: ["Reimbursement Type Category"],
  summary: "Delete reimbursement type category",
  description: "Deletes a reimbursement type category",
  middleware: [
    authMiddleware,
    orgGuard({
      source: { from: "resource", table: "reimbursementTypeCategory" },
      roles: ["admin", "owner"],
    }),
  ] as const,
  request: {
    params: ReimbursementParamsSchema,
  },
  responses: {
    200: {
      description: "Reimbursement type category deleted",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Reimbursement type category not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Export route types for controller type safety
export type ListReimbursementUsersRoute = typeof listUsersRoute;
export type GetReimbursementUserRoute = typeof getUserRoute;
export type CreateReimbursementUserRoute = typeof createUserRoute;
export type UpdateReimbursementUserRoute = typeof updateUserRoute;
export type DeleteReimbursementUserRoute = typeof deleteUserRoute;
export type ListReimbursementTypesRoute = typeof listTypesRoute;
export type GetReimbursementTypeRoute = typeof getTypeRoute;
export type CreateReimbursementTypeRoute = typeof createTypeRoute;
export type DeleteReimbursementTypeRoute = typeof deleteTypeRoute;
export type ListReimbursementRolesRoute = typeof listRolesRoute;
export type GetReimbursementRoleRoute = typeof getRoleRoute;
export type CreateReimbursementRoleRoute = typeof createRoleRoute;
export type DeleteReimbursementRoleRoute = typeof deleteRoleRoute;
export type ListReimbursementTypeCategoriesRoute = typeof listTypeCategoriesRoute;
export type GetReimbursementTypeCategoryRoute = typeof getTypeCategoryRoute;
export type CreateReimbursementTypeCategoryRoute = typeof createTypeCategoryRoute;
export type DeleteReimbursementTypeCategoryRoute = typeof deleteTypeCategoryRoute;

// Register routes
app.openapi(listUsersRoute, reimbursementController.listUsers);
app.openapi(getUserRoute, reimbursementController.getUser);
app.openapi(createUserRoute, reimbursementController.createUser);
app.openapi(updateUserRoute, reimbursementController.updateUser);
app.openapi(deleteUserRoute, reimbursementController.deleteUser);
app.openapi(listTypesRoute, reimbursementController.listTypes);
app.openapi(getTypeRoute, reimbursementController.getType);
app.openapi(createTypeRoute, reimbursementController.createType);
app.openapi(deleteTypeRoute, reimbursementController.deleteType);
app.openapi(listRolesRoute, reimbursementController.listRoles);
app.openapi(getRoleRoute, reimbursementController.getRole);
app.openapi(createRoleRoute, reimbursementController.createRole);
app.openapi(deleteRoleRoute, reimbursementController.deleteRole);
app.openapi(listTypeCategoriesRoute, reimbursementController.listTypeCategories);
app.openapi(getTypeCategoryRoute, reimbursementController.getTypeCategory);
app.openapi(createTypeCategoryRoute, reimbursementController.createTypeCategory);
app.openapi(deleteTypeCategoryRoute, reimbursementController.deleteTypeCategory);

export { app as reimbursementRoutes };

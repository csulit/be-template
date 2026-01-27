import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { authMiddleware, roleGuard, type AuthEnv } from "../../middleware/auth.middleware.js";
import { orgGuard } from "../../middleware/org.middleware.js";
import { ErrorResponseSchema } from "../../shared/dtos/response.dto.js";
import { usersController } from "./users.controller.js";
import {
  UserProfileResponseSchema,
  UserAdminResponseSchema,
  UserAdminListResponseSchema,
  OrgMemberListResponseSchema,
  OrgMemberResponseSchema,
  OrganizationResponseSchema,
  OrganizationListResponseSchema,
  DevTokenResponseSchema,
} from "./users.dto.js";
import {
  UpdateProfileSchema,
  ListUsersQuerySchema,
  UserIdParamSchema,
  AdminUpdateUserSchema,
  BanUserSchema,
  ListOrgMembersQuerySchema,
  OrgIdParamSchema,
  OrgMemberParamSchema,
  ListOrgsQuerySchema,
  CreateOrgSchema,
  UpdateOrgSchema,
  SetOrgMemberRoleSchema,
  TransferOwnershipSchema,
  DevTokenSchema,
  CreateUserSchema,
} from "./users.validator.js";

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
    404: {
      description: "User not found",
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
    404: {
      description: "User not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// ─── Admin Routes ───────────────────────────────────────────────────────────

// GET /api/users/
const listUsersRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Users (Superadmin)"],
  summary: "List all users",
  description: "Returns a paginated list of all users (superadmin only)",
  middleware: [authMiddleware, roleGuard("superadmin")] as const,
  request: {
    query: ListUsersQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated users list",
      content: {
        "application/json": {
          schema: UserAdminListResponseSchema,
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

// GET /api/users/:id
const getUserByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Users (Superadmin)"],
  summary: "Get user by ID",
  description: "Returns a single user by ID (superadmin only)",
  middleware: [authMiddleware, roleGuard("superadmin")] as const,
  request: {
    params: UserIdParamSchema,
  },
  responses: {
    200: {
      description: "User details",
      content: {
        "application/json": {
          schema: UserAdminResponseSchema,
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
      description: "User not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// PATCH /api/users/:id
const adminUpdateUserRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Users (Superadmin)"],
  summary: "Admin update user",
  description: "Updates a user's details (superadmin only)",
  middleware: [authMiddleware, roleGuard("superadmin")] as const,
  request: {
    params: UserIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: AdminUpdateUserSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated user",
      content: {
        "application/json": {
          schema: UserAdminResponseSchema,
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
      description: "User not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /api/users/:id/ban
const banUserRoute = createRoute({
  method: "post",
  path: "/{id}/ban",
  tags: ["Users (Superadmin)"],
  summary: "Ban user",
  description: "Bans a user (superadmin only)",
  middleware: [authMiddleware, roleGuard("superadmin")] as const,
  request: {
    params: UserIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: BanUserSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "User banned",
      content: {
        "application/json": {
          schema: UserAdminResponseSchema,
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
      description: "User not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /api/users/:id/unban
const unbanUserRoute = createRoute({
  method: "post",
  path: "/{id}/unban",
  tags: ["Users (Superadmin)"],
  summary: "Unban user",
  description: "Unbans a user (superadmin only)",
  middleware: [authMiddleware, roleGuard("superadmin")] as const,
  request: {
    params: UserIdParamSchema,
  },
  responses: {
    200: {
      description: "User unbanned",
      content: {
        "application/json": {
          schema: UserAdminResponseSchema,
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
      description: "User not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /api/users/org-members
const listOrgMembersRoute = createRoute({
  method: "get",
  path: "/org-members",
  tags: ["Organization Members"],
  summary: "List organization members",
  description: "Returns a paginated list of organization members (org admin/owner or superadmin)",
  middleware: [
    authMiddleware,
    orgGuard({
      source: { from: "query" },
      roles: ["admin", "owner"],
      allowGlobalRoles: ["superadmin"],
    }),
  ] as const,
  request: {
    query: ListOrgMembersQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated organization members list",
      content: {
        "application/json": {
          schema: OrgMemberListResponseSchema,
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

// ─── Organization Admin Routes ──────────────────────────────────────────────

// GET /api/users/orgs
const listOrgsRoute = createRoute({
  method: "get",
  path: "/orgs",
  tags: ["Organizations (Superadmin)"],
  summary: "List all organizations",
  description: "Returns a paginated list of all organizations (superadmin only)",
  middleware: [authMiddleware, roleGuard("superadmin")] as const,
  request: {
    query: ListOrgsQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated organizations list",
      content: {
        "application/json": {
          schema: OrganizationListResponseSchema,
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

// GET /api/users/orgs/:orgId
const getOrgByIdRoute = createRoute({
  method: "get",
  path: "/orgs/{orgId}",
  tags: ["Organizations"],
  summary: "Get organization by ID",
  description: "Returns a single organization by ID (org member or superadmin)",
  middleware: [
    authMiddleware,
    orgGuard({
      source: { from: "param", paramName: "orgId" },
      allowGlobalRoles: ["superadmin"],
    }),
  ] as const,
  request: {
    params: OrgIdParamSchema,
  },
  responses: {
    200: {
      description: "Organization details",
      content: {
        "application/json": {
          schema: OrganizationResponseSchema,
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
      description: "Organization not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /api/users/orgs
const createOrgRoute = createRoute({
  method: "post",
  path: "/orgs",
  tags: ["Organizations (Superadmin)"],
  summary: "Create organization",
  description: "Creates a new organization (superadmin only)",
  middleware: [authMiddleware, roleGuard("superadmin")] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateOrgSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Organization created successfully",
      content: {
        "application/json": {
          schema: OrganizationResponseSchema,
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
      description: "Organization with this slug already exists",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// PATCH /api/users/orgs/:orgId
const updateOrgRoute = createRoute({
  method: "patch",
  path: "/orgs/{orgId}",
  tags: ["Organizations"],
  summary: "Update organization",
  description: "Updates an organization (org admin/owner or superadmin)",
  middleware: [
    authMiddleware,
    orgGuard({
      source: { from: "param", paramName: "orgId" },
      roles: ["admin", "owner"],
      allowGlobalRoles: ["superadmin"],
    }),
  ] as const,
  request: {
    params: OrgIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: UpdateOrgSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Organization updated successfully",
      content: {
        "application/json": {
          schema: OrganizationResponseSchema,
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
      description: "Organization not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Organization with this slug already exists",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// DELETE /api/users/orgs/:orgId
const deleteOrgRoute = createRoute({
  method: "delete",
  path: "/orgs/{orgId}",
  tags: ["Organizations"],
  summary: "Delete organization",
  description: "Deletes an organization and all its members (org owner or superadmin)",
  middleware: [
    authMiddleware,
    orgGuard({
      source: { from: "param", paramName: "orgId" },
      roles: ["owner"],
      allowGlobalRoles: ["superadmin"],
    }),
  ] as const,
  request: {
    params: OrgIdParamSchema,
  },
  responses: {
    200: {
      description: "Organization deleted successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(true) }),
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
      description: "Organization not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// PATCH /api/users/orgs/:orgId/members/:memberId/role
const setOrgMemberRoleRoute = createRoute({
  method: "patch",
  path: "/orgs/{orgId}/members/{memberId}/role",
  tags: ["Organizations"],
  summary: "Set organization member role",
  description: "Sets a member's role within the organization (org admin/owner or superadmin)",
  middleware: [
    authMiddleware,
    orgGuard({
      source: { from: "param", paramName: "orgId" },
      roles: ["admin", "owner"],
      allowGlobalRoles: ["superadmin"],
    }),
  ] as const,
  request: {
    params: OrgMemberParamSchema,
    body: {
      content: {
        "application/json": {
          schema: SetOrgMemberRoleSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Member role updated successfully",
      content: {
        "application/json": {
          schema: OrgMemberResponseSchema,
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
      description: "Member not found in this organization",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// DELETE /api/users/orgs/:orgId/members/:memberId
const removeOrgMemberRoute = createRoute({
  method: "delete",
  path: "/orgs/{orgId}/members/{memberId}",
  tags: ["Organizations"],
  summary: "Remove organization member",
  description: "Removes a member from the organization (org admin/owner or superadmin)",
  middleware: [
    authMiddleware,
    orgGuard({
      source: { from: "param", paramName: "orgId" },
      roles: ["admin", "owner"],
      allowGlobalRoles: ["superadmin"],
    }),
  ] as const,
  request: {
    params: OrgMemberParamSchema,
  },
  responses: {
    200: {
      description: "Member removed successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(true) }),
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
      description: "Member not found in this organization",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /api/users/orgs/:orgId/transfer-ownership
const transferOrgOwnershipRoute = createRoute({
  method: "post",
  path: "/orgs/{orgId}/transfer-ownership",
  tags: ["Organizations"],
  summary: "Transfer organization ownership",
  description:
    "Transfers ownership of the organization to another member (org owner or superadmin)",
  middleware: [
    authMiddleware,
    orgGuard({
      source: { from: "param", paramName: "orgId" },
      roles: ["owner"],
      allowGlobalRoles: ["superadmin"],
    }),
  ] as const,
  request: {
    params: OrgIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: TransferOwnershipSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Ownership transferred successfully",
      content: {
        "application/json": {
          schema: OrganizationResponseSchema,
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
      description: "Organization or member not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// ─── Create User Route ──────────────────────────────────────────────────────

// POST /api/users/create
const createUserRoute = createRoute({
  method: "post",
  path: "/create",
  tags: ["Users"],
  summary: "Create a new user",
  description:
    "Creates a new user account. Superadmin can create users with any role and optionally assign to an organization. Organization admin/owner can only create users under their own organization.",
  middleware: [authMiddleware] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateUserSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "User created successfully",
      content: {
        "application/json": {
          schema: UserAdminResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid input or failed to create user",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
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
      description: "Forbidden - insufficient permissions",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Organization not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: "User with this email already exists",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// ─── Dev-only Routes ────────────────────────────────────────────────────────

// POST /api/users/dev-token
const devTokenRoute = createRoute({
  method: "post",
  path: "/dev-token",
  tags: ["Users (Dev)"],
  summary: "Generate dev access token",
  description:
    "Generates a session token from email/password credentials. Only available in development mode. Use the returned token as a Bearer token in the Authorization header.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: DevTokenSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Token generated successfully",
      content: {
        "application/json": {
          schema: DevTokenResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid credentials or not in development mode",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Export route types for controller type safety
export type CreateUserRoute = typeof createUserRoute;
export type DevTokenRoute = typeof devTokenRoute;
export type GetProfileRoute = typeof getProfileRoute;
export type UpdateProfileRoute = typeof updateProfileRoute;
export type ListUsersRoute = typeof listUsersRoute;
export type GetUserByIdRoute = typeof getUserByIdRoute;
export type AdminUpdateUserRoute = typeof adminUpdateUserRoute;
export type BanUserRoute = typeof banUserRoute;
export type UnbanUserRoute = typeof unbanUserRoute;
export type ListOrgMembersRoute = typeof listOrgMembersRoute;
export type ListOrgsRoute = typeof listOrgsRoute;
export type GetOrgByIdRoute = typeof getOrgByIdRoute;
export type CreateOrgRoute = typeof createOrgRoute;
export type UpdateOrgRoute = typeof updateOrgRoute;
export type DeleteOrgRoute = typeof deleteOrgRoute;
export type SetOrgMemberRoleRoute = typeof setOrgMemberRoleRoute;
export type RemoveOrgMemberRoute = typeof removeOrgMemberRoute;
export type TransferOrgOwnershipRoute = typeof transferOrgOwnershipRoute;

// Register routes - static paths must come before parameterized paths
// @ts-expect-error devTokenRoute has no auth middleware, causing env type mismatch
app.openapi(devTokenRoute, usersController.generateDevToken);
app.openapi(getProfileRoute, usersController.getProfile);
app.openapi(updateProfileRoute, usersController.updateProfile);
app.openapi(listUsersRoute, usersController.listUsers);
app.openapi(createUserRoute, usersController.createUser);
app.openapi(listOrgMembersRoute, usersController.listOrgMembers);

// Organization admin routes - static paths before parameterized /{id}
app.openapi(listOrgsRoute, usersController.listOrgs);
app.openapi(createOrgRoute, usersController.createOrg);
app.openapi(getOrgByIdRoute, usersController.getOrgById);
app.openapi(updateOrgRoute, usersController.updateOrg);
app.openapi(deleteOrgRoute, usersController.deleteOrg);
app.openapi(setOrgMemberRoleRoute, usersController.setOrgMemberRole);
app.openapi(removeOrgMemberRoute, usersController.removeOrgMember);
app.openapi(transferOrgOwnershipRoute, usersController.transferOrgOwnership);

// Parameterized /{id} routes must come after all static paths to avoid catching them
app.openapi(getUserByIdRoute, usersController.getUserById);
app.openapi(adminUpdateUserRoute, usersController.adminUpdateUser);
app.openapi(banUserRoute, usersController.banUser);
app.openapi(unbanUserRoute, usersController.unbanUser);

export { app as usersRoutes };

import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "../../shared/validators/pagination.js";

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional().openapi({
    example: "John Doe",
    description: "User's display name",
  }),
  image: z.string().url().nullable().optional().openapi({
    example: "https://example.com/avatar.jpg",
    description: "Profile image URL",
  }),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// ──────────────────────────────────────────────
// Query schemas
// ──────────────────────────────────────────────

export const ListUsersQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional().openapi({
    description: "Search by name or email",
    example: "john",
  }),
  role: z.string().optional().openapi({
    description: "Filter by role",
    example: "admin",
  }),
});

export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

export const ListOrgMembersQuerySchema = PaginationQuerySchema.extend({
  organizationId: z.string().openapi({
    description: "Organization ID",
    example: "clx1234567890abcdef",
  }),
  role: z.string().optional().openapi({
    description: "Filter by organization member role",
    example: "member",
  }),
});

export type ListOrgMembersQuery = z.infer<typeof ListOrgMembersQuerySchema>;

// ──────────────────────────────────────────────
// Params schemas
// ──────────────────────────────────────────────

export const UserIdParamSchema = z.object({
  id: z.string().openapi({
    param: { name: "id", in: "path" },
    description: "User ID",
    example: "clx1234567890abcdef",
  }),
});

export type UserIdParam = z.infer<typeof UserIdParamSchema>;

// ──────────────────────────────────────────────
// Admin body schemas
// ──────────────────────────────────────────────

export const AdminUpdateUserSchema = z
  .object({
    name: z.string().min(1).max(100).optional().openapi({
      description: "User's display name",
      example: "Jane Doe",
    }),
    role: z.string().optional().openapi({
      description: "User role",
      example: "admin",
    }),
    banned: z.boolean().optional().openapi({
      description: "Whether the user is banned",
      example: false,
    }),
    banReason: z.string().nullable().optional().openapi({
      description: "Reason for banning the user",
      example: "Violated terms of service",
    }),
    banExpires: z.string().datetime().nullable().optional().openapi({
      description: "When the ban expires (ISO 8601 datetime)",
      example: "2025-12-31T23:59:59Z",
    }),
  })
  .openapi("AdminUpdateUserBody");

export type AdminUpdateUserInput = z.infer<typeof AdminUpdateUserSchema>;

export const BanUserSchema = z
  .object({
    banReason: z.string().optional().openapi({
      description: "Reason for banning the user",
      example: "Violated terms of service",
    }),
    banExpires: z.string().datetime().nullable().optional().openapi({
      description: "When the ban expires (ISO 8601 datetime), null for permanent ban",
      example: "2025-12-31T23:59:59Z",
    }),
  })
  .openapi("BanUserBody");

export type BanUserInput = z.infer<typeof BanUserSchema>;

// ──────────────────────────────────────────────
// Organization param schemas
// ──────────────────────────────────────────────

export const OrgIdParamSchema = z.object({
  orgId: z.string().openapi({
    param: { name: "orgId", in: "path" },
    description: "Organization ID",
    example: "clx1234567890orgabc",
  }),
});

export type OrgIdParam = z.infer<typeof OrgIdParamSchema>;

export const OrgMemberParamSchema = z.object({
  orgId: z.string().openapi({
    param: { name: "orgId", in: "path" },
    description: "Organization ID",
    example: "clx1234567890orgabc",
  }),
  memberId: z.string().openapi({
    param: { name: "memberId", in: "path" },
    description: "Member ID",
    example: "clx1234567890member",
  }),
});

export type OrgMemberParam = z.infer<typeof OrgMemberParamSchema>;

// ──────────────────────────────────────────────
// Organization query schemas
// ──────────────────────────────────────────────

export const ListOrgsQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional().openapi({
    description: "Search by organization name or slug",
    example: "acme",
  }),
});

export type ListOrgsQuery = z.infer<typeof ListOrgsQuerySchema>;

// ──────────────────────────────────────────────
// Organization body schemas
// ──────────────────────────────────────────────

export const CreateOrgSchema = z
  .object({
    name: z.string().min(1).max(100).openapi({
      description: "Organization name",
      example: "Acme Corp",
    }),
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/)
      .openapi({
        description: "URL-friendly slug (lowercase, hyphens, numbers only)",
        example: "acme-corp",
      }),
    logo: z.string().url().nullable().optional().openapi({
      description: "Organization logo URL",
      example: "https://example.com/logo.png",
    }),
    metadata: z.string().nullable().optional().openapi({
      description: "Organization metadata (JSON string)",
      example: null,
    }),
  })
  .openapi("CreateOrgBody");

export type CreateOrgInput = z.infer<typeof CreateOrgSchema>;

export const UpdateOrgSchema = z
  .object({
    name: z.string().min(1).max(100).optional().openapi({
      description: "Organization name",
      example: "Acme Corp Updated",
    }),
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/)
      .optional()
      .openapi({
        description: "URL-friendly slug",
        example: "acme-corp-updated",
      }),
    logo: z.string().url().nullable().optional().openapi({
      description: "Organization logo URL",
      example: "https://example.com/new-logo.png",
    }),
    metadata: z.string().nullable().optional().openapi({
      description: "Organization metadata (JSON string)",
      example: null,
    }),
  })
  .openapi("UpdateOrgBody");

export type UpdateOrgInput = z.infer<typeof UpdateOrgSchema>;

export const SetOrgMemberRoleSchema = z
  .object({
    role: z.string().min(1).openapi({
      description: "New role for the member (e.g., member, admin, owner)",
      example: "admin",
    }),
  })
  .openapi("SetOrgMemberRoleBody");

export type SetOrgMemberRoleInput = z.infer<typeof SetOrgMemberRoleSchema>;

export const TransferOwnershipSchema = z
  .object({
    newOwnerId: z.string().openapi({
      description: "User ID of the new owner (must be an existing member of the organization)",
      example: "clx1234567890abcdef",
    }),
  })
  .openapi("TransferOwnershipBody");

export type TransferOwnershipInput = z.infer<typeof TransferOwnershipSchema>;

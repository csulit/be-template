import { z } from "@hono/zod-openapi";
import { createSuccessResponseSchema } from "../../shared/dtos/response.dto.js";
import { createPaginatedResponseSchema } from "../../shared/dtos/pagination.dto.js";

// ─── Base User Schema ────────────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string().cuid().openapi({ example: "clx1234567890abcdef" }),
  name: z.string().openapi({ example: "John Doe" }),
  email: z.string().email().openapi({ example: "john@example.com" }),
  emailVerified: z.boolean().openapi({ example: true }),
  image: z.string().url().nullable().openapi({ example: "https://example.com/avatar.jpg" }),
  role: z.string().openapi({ example: "user" }),
  createdAt: z.date().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  updatedAt: z.date().openapi({ example: "2024-01-01T00:00:00.000Z" }),
});

export type UserDTO = z.infer<typeof UserSchema>;

export const UserResponseSchema = createSuccessResponseSchema(UserSchema);

export const UserProfileSchema = UserSchema.omit({ emailVerified: true });

export const UserProfileResponseSchema = createSuccessResponseSchema(UserProfileSchema);

// ─── Admin User Schema ───────────────────────────────────────────────────────

export const UserAdminSchema = UserSchema.extend({
  banned: z.boolean().nullable().openapi({
    description: "Whether the user is banned",
    example: false,
  }),
  banReason: z.string().nullable().openapi({
    description: "Reason for the ban",
    example: null,
  }),
  banExpires: z.date().nullable().openapi({
    description: "When the ban expires",
    example: null,
  }),
});

export type UserAdminDTO = z.infer<typeof UserAdminSchema>;

export const UserAdminResponseSchema = createSuccessResponseSchema(UserAdminSchema);

export const UserAdminListResponseSchema = createPaginatedResponseSchema(UserAdminSchema);

// ─── Org Member Schema ───────────────────────────────────────────────────────

export const OrgMemberUserSchema = z.object({
  id: z.string().cuid().openapi({
    description: "User ID",
    example: "clx1234567890abcdef",
  }),
  name: z.string().openapi({
    description: "User display name",
    example: "John Doe",
  }),
  email: z.string().email().openapi({
    description: "User email address",
    example: "john@example.com",
  }),
  image: z.string().url().nullable().openapi({
    description: "User avatar URL",
    example: "https://example.com/avatar.jpg",
  }),
});

export const OrgMemberSchema = z.object({
  id: z.string().cuid().openapi({
    description: "Membership ID",
    example: "clx1234567890member",
  }),
  role: z.string().openapi({
    description: "Member role within the organization",
    example: "member",
  }),
  createdAt: z.date().openapi({
    description: "When the member joined the organization",
    example: "2024-01-01T00:00:00.000Z",
  }),
  user: OrgMemberUserSchema,
});

export type OrgMemberDTO = z.infer<typeof OrgMemberSchema>;

export const OrgMemberResponseSchema = createSuccessResponseSchema(OrgMemberSchema);

export const OrgMemberListResponseSchema = createPaginatedResponseSchema(OrgMemberSchema);

// ─── Organization Schema ─────────────────────────────────────────────────────

export const OrganizationSchema = z.object({
  id: z.string().cuid().openapi({
    description: "Organization unique identifier",
    example: "clx1234567890orgdef",
  }),
  name: z.string().openapi({
    description: "Organization name",
    example: "Acme Corp",
  }),
  slug: z.string().openapi({
    description: "URL-friendly organization identifier",
    example: "acme-corp",
  }),
  logo: z.string().url().nullable().openapi({
    description: "Organization logo URL",
    example: "https://example.com/logo.png",
  }),
  createdAt: z.date().openapi({
    description: "When the organization was created",
    example: "2024-01-01T00:00:00.000Z",
  }),
  metadata: z.string().nullable().openapi({
    description: "Additional organization metadata",
    example: null,
  }),
});

export type OrganizationDTO = z.infer<typeof OrganizationSchema>;

export const OrganizationResponseSchema = createSuccessResponseSchema(OrganizationSchema);

export const OrganizationListResponseSchema = createPaginatedResponseSchema(OrganizationSchema);

// ─── Dev Token Schema ───────────────────────────────────────────────────────

export const DevTokenResponseDataSchema = z.object({
  token: z.string().openapi({
    description: "Session token to use as Bearer token",
    example: "session_token_abc123",
  }),
  expiresAt: z.string().datetime().openapi({
    description: "Token expiration timestamp",
    example: "2025-02-01T00:00:00.000Z",
  }),
});

export const DevTokenResponseSchema = createSuccessResponseSchema(DevTokenResponseDataSchema);

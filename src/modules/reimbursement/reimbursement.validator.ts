import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "../../shared/validators/pagination.js";
import { IdParamSchema } from "../../shared/validators/common.js";

// ──────────────────────────────────────────────
// Reimbursement User validators
// ──────────────────────────────────────────────

export const CreateReimbursementUserBodySchema = z
  .object({
    userId: z.string().cuid().openapi({
      description: "The user ID to assign a reimbursement role",
      example: "clx1234567890abcdef",
    }),
    roleId: z.string().cuid().openapi({
      description: "The reimbursement role ID to assign",
      example: "clx1234567890abcdef",
    }),
    organizationId: z.string().cuid().openapi({
      description: "The organization this assignment belongs to",
      example: "clx1234567890abcdef",
    }),
  })
  .openapi("CreateReimbursementUserBody");

export type CreateReimbursementUserBody = z.infer<typeof CreateReimbursementUserBodySchema>;

export const UpdateReimbursementUserBodySchema = z
  .object({
    roleId: z.string().cuid().optional().openapi({
      description: "The reimbursement role ID to update to",
      example: "clx1234567890abcdef",
    }),
  })
  .openapi("UpdateReimbursementUserBody");

export type UpdateReimbursementUserBody = z.infer<typeof UpdateReimbursementUserBodySchema>;

// ──────────────────────────────────────────────
// Reimbursement Type validators
// ──────────────────────────────────────────────

export const CreateReimbursementTypeBodySchema = z
  .object({
    name: z.string().min(1).openapi({
      description: "The reimbursement type name",
      example: "Transportation",
    }),
    description: z.string().optional().openapi({
      description: "Optional description of the reimbursement type",
      example: "Covers transportation-related expenses",
    }),
    organizationId: z.string().cuid().openapi({
      description: "The organization this type belongs to",
      example: "clx1234567890abcdef",
    }),
    categoryId: z.string().cuid().optional().openapi({
      description: "Optional category ID for this reimbursement type",
      example: "clx1234567890abcdef",
    }),
  })
  .openapi("CreateReimbursementTypeBody");

export type CreateReimbursementTypeBody = z.infer<typeof CreateReimbursementTypeBodySchema>;

// ──────────────────────────────────────────────
// Reimbursement Role validators
// ──────────────────────────────────────────────

export const CreateReimbursementRoleBodySchema = z
  .object({
    name: z.string().min(1).openapi({
      description: "The role name",
      example: "Employee",
    }),
    organizationId: z.string().cuid().openapi({
      description: "The organization this role belongs to",
      example: "clx1234567890abcdef",
    }),
  })
  .openapi("CreateReimbursementRoleBody");

export type CreateReimbursementRoleBody = z.infer<typeof CreateReimbursementRoleBodySchema>;

// ──────────────────────────────────────────────
// Reimbursement Type Category validators
// ──────────────────────────────────────────────

export const CreateReimbursementTypeCategoryBodySchema = z
  .object({
    name: z.string().min(1).openapi({
      description: "The type category name",
      example: "Scheduled",
    }),
    organizationId: z.string().cuid().openapi({
      description: "The organization this category belongs to",
      example: "clx1234567890abcdef",
    }),
  })
  .openapi("CreateReimbursementTypeCategoryBody");

export type CreateReimbursementTypeCategoryBody = z.infer<
  typeof CreateReimbursementTypeCategoryBodySchema
>;

// ──────────────────────────────────────────────
// Shared params
// ──────────────────────────────────────────────

export const ReimbursementParamsSchema = IdParamSchema;

export type ReimbursementParams = z.infer<typeof ReimbursementParamsSchema>;

// ──────────────────────────────────────────────
// Query schemas
// ──────────────────────────────────────────────

const OrganizationQuerySchema = PaginationQuerySchema.extend({
  organizationId: z.string().cuid().openapi({
    description: "Filter by organization ID",
    example: "clx1234567890abcdef",
  }),
});

export const ListReimbursementQuerySchema = OrganizationQuerySchema.extend({
  roleId: z.string().cuid().optional().openapi({
    description: "Filter by reimbursement role ID",
    example: "clx1234567890abcdef",
  }),
});

export type ListReimbursementQuery = z.infer<typeof ListReimbursementQuerySchema>;

export const ListReimbursementRolesQuerySchema = OrganizationQuerySchema;

export type ListReimbursementRolesQuery = z.infer<typeof ListReimbursementRolesQuerySchema>;

export const ListReimbursementTypeCategoriesQuerySchema = OrganizationQuerySchema;

export type ListReimbursementTypeCategoriesQuery = z.infer<
  typeof ListReimbursementTypeCategoriesQuerySchema
>;

export const ListReimbursementTypesQuerySchema = OrganizationQuerySchema.extend({
  categoryId: z.string().cuid().optional().openapi({
    description: "Filter by category ID",
    example: "clx1234567890abcdef",
  }),
});

export type ListReimbursementTypesQuery = z.infer<typeof ListReimbursementTypesQuerySchema>;

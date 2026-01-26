import { z } from "@hono/zod-openapi";
import { createSuccessResponseSchema } from "../../shared/dtos/response.dto.js";
import { createPaginatedResponseSchema } from "../../shared/dtos/pagination.dto.js";
import type {
  ReimbursementUser,
  ReimbursementType,
  ReimbursementRole as PrismaReimbursementRole,
  ReimbursementTypeCategory as PrismaReimbursementTypeCategory,
  User,
} from "../../generated/prisma/client.js";

// ============================================================================
// Nested Schemas
// ============================================================================

export const ReimbursementUserSummarySchema = z.object({
  id: z.string().cuid().openapi({
    description: "Unique identifier of the user",
    example: "clx1234567890abcdef",
  }),
  name: z.string().openapi({
    description: "Full name of the user",
    example: "John Doe",
  }),
  email: z.string().email().openapi({
    description: "Email address of the user",
    example: "john@example.com",
  }),
});

// ============================================================================
// ReimbursementRole Schema
// ============================================================================

export const ReimbursementRoleSchema = z
  .object({
    id: z.string().cuid().openapi({
      description: "Unique identifier for the reimbursement role",
      example: "clx1234567890abcdef",
    }),
    name: z.string().openapi({
      description: "Name of the reimbursement role",
      example: "Employee",
    }),
    organizationId: z.string().cuid().openapi({
      description: "Reference to the organization this role belongs to",
      example: "clxorg1234567890abc",
    }),
    createdAt: z.string().datetime().openapi({
      description: "Timestamp when the reimbursement role was created",
      example: "2024-01-15T10:30:00.000Z",
    }),
    updatedAt: z.string().datetime().openapi({
      description: "Timestamp when the reimbursement role was last updated",
      example: "2024-01-15T10:30:00.000Z",
    }),
  })
  .openapi("ReimbursementRole");

export type ReimbursementRoleDTO = z.infer<typeof ReimbursementRoleSchema>;

// ============================================================================
// ReimbursementTypeCategory Schema
// ============================================================================

export const ReimbursementTypeCategorySchema = z
  .object({
    id: z.string().cuid().openapi({
      description: "Unique identifier for the reimbursement type category",
      example: "clxcat1234567890abc",
    }),
    name: z.string().openapi({
      description: "Name of the reimbursement type category",
      example: "Travel",
    }),
    organizationId: z.string().cuid().openapi({
      description: "Reference to the organization this category belongs to",
      example: "clxorg1234567890abc",
    }),
    createdAt: z.string().datetime().openapi({
      description: "Timestamp when the category was created",
      example: "2024-01-15T10:30:00.000Z",
    }),
    updatedAt: z.string().datetime().openapi({
      description: "Timestamp when the category was last updated",
      example: "2024-01-15T10:30:00.000Z",
    }),
  })
  .openapi("ReimbursementTypeCategory");

export type ReimbursementTypeCategoryDTO = z.infer<typeof ReimbursementTypeCategorySchema>;

// ============================================================================
// ReimbursementUser Schema
// ============================================================================

export const ReimbursementUserSchema = z
  .object({
    id: z.string().cuid().openapi({
      description: "Unique identifier for the reimbursement user",
      example: "clx1234567890abcdef",
    }),
    userId: z.string().cuid().openapi({
      description: "Reference to the associated user",
      example: "clx0987654321fedcba",
    }),
    roleId: z.string().cuid().openapi({
      description: "Reference to the assigned reimbursement role",
      example: "clxrole123456789abc",
    }),
    organizationId: z.string().cuid().openapi({
      description: "Reference to the organization this reimbursement user belongs to",
      example: "clxorg1234567890abc",
    }),
    role: ReimbursementRoleSchema.openapi({
      description: "The reimbursement role assigned to this user",
    }),
    user: ReimbursementUserSummarySchema.openapi({
      description: "Summary of the associated user",
    }),
    createdAt: z.string().datetime().openapi({
      description: "Timestamp when the reimbursement user was created",
      example: "2024-01-15T10:30:00.000Z",
    }),
    updatedAt: z.string().datetime().openapi({
      description: "Timestamp when the reimbursement user was last updated",
      example: "2024-01-15T10:30:00.000Z",
    }),
  })
  .openapi("ReimbursementUser");

export type ReimbursementUserDTO = z.infer<typeof ReimbursementUserSchema>;

// ============================================================================
// ReimbursementType Schema
// ============================================================================

export const ReimbursementTypeSchema = z
  .object({
    id: z.string().cuid().openapi({
      description: "Unique identifier for the reimbursement type",
      example: "clx1234567890abcdef",
    }),
    name: z.string().openapi({
      description: "Name of the reimbursement type",
      example: "Transportation",
    }),
    description: z.string().nullable().openapi({
      description: "Optional description of the reimbursement type",
      example: "Covers transportation-related expenses",
    }),
    organizationId: z.string().cuid().openapi({
      description: "Reference to the organization this type belongs to",
      example: "clxorg1234567890abc",
    }),
    categoryId: z.string().cuid().nullable().openapi({
      description: "Optional reference to the reimbursement type category",
      example: "clxcat1234567890abc",
    }),
    category: ReimbursementTypeCategorySchema.nullable().openapi({
      description: "The category this reimbursement type belongs to, if any",
    }),
    createdAt: z.string().datetime().openapi({
      description: "Timestamp when the reimbursement type was created",
      example: "2024-01-15T10:30:00.000Z",
    }),
    updatedAt: z.string().datetime().openapi({
      description: "Timestamp when the reimbursement type was last updated",
      example: "2024-01-15T10:30:00.000Z",
    }),
  })
  .openapi("ReimbursementType");

export type ReimbursementTypeDTO = z.infer<typeof ReimbursementTypeSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const ReimbursementUserResponseSchema = createSuccessResponseSchema(ReimbursementUserSchema);
export const ReimbursementUserListResponseSchema =
  createPaginatedResponseSchema(ReimbursementUserSchema);

export const ReimbursementTypeResponseSchema = createSuccessResponseSchema(ReimbursementTypeSchema);
export const ReimbursementTypeListResponseSchema =
  createPaginatedResponseSchema(ReimbursementTypeSchema);

export const ReimbursementRoleResponseSchema = createSuccessResponseSchema(ReimbursementRoleSchema);
export const ReimbursementRoleListResponseSchema =
  createPaginatedResponseSchema(ReimbursementRoleSchema);

export const ReimbursementTypeCategoryResponseSchema = createSuccessResponseSchema(
  ReimbursementTypeCategorySchema
);
export const ReimbursementTypeCategoryListResponseSchema = createPaginatedResponseSchema(
  ReimbursementTypeCategorySchema
);

// ============================================================================
// Type Definitions for Database Records with Relations
// ============================================================================

export type ReimbursementUserWithRelations = ReimbursementUser & {
  user: Pick<User, "id" | "name" | "email">;
  role: PrismaReimbursementRole;
};

export type ReimbursementTypeWithCategory = ReimbursementType & {
  category: PrismaReimbursementTypeCategory | null;
};

// ============================================================================
// Transformation Functions
// ============================================================================

export function toReimbursementRoleDto(record: PrismaReimbursementRole): ReimbursementRoleDTO {
  return {
    id: record.id,
    name: record.name,
    organizationId: record.organizationId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toReimbursementTypeCategoryDto(
  record: PrismaReimbursementTypeCategory
): ReimbursementTypeCategoryDTO {
  return {
    id: record.id,
    name: record.name,
    organizationId: record.organizationId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toReimbursementUserDto(
  record: ReimbursementUserWithRelations
): ReimbursementUserDTO {
  return {
    id: record.id,
    userId: record.userId,
    roleId: record.roleId,
    organizationId: record.organizationId,
    role: toReimbursementRoleDto(record.role),
    user: {
      id: record.user.id,
      name: record.user.name,
      email: record.user.email,
    },
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toReimbursementTypeDto(
  record: ReimbursementTypeWithCategory
): ReimbursementTypeDTO {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    organizationId: record.organizationId,
    categoryId: record.categoryId,
    category: record.category ? toReimbursementTypeCategoryDto(record.category) : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

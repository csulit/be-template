---
name: dto-patterns
description: Create DTOs for API responses following project patterns. Use when creating response transformation, building Zod schemas for OpenAPI documentation, or formatting API output.
---

# DTO Patterns Skill

This skill guides the creation of Data Transfer Objects for API responses in this Hono codebase.

## DTO Structure

Every DTO consists of:

1. A Zod schema (for validation and OpenAPI documentation)
2. TypeScript type export
3. A `to*Dto()` transformation function

## Basic DTO Pattern

```typescript
import { z } from "zod";

// Response schema with OpenAPI metadata
export const FeatureResponseSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "Unique identifier",
      example: "123e4567-e89b-12d3-a456-426614174000",
    }),
    name: z.string().openapi({
      description: "Feature name",
      example: "My Feature",
    }),
    status: z.enum(["active", "inactive"]).openapi({
      description: "Current status",
      example: "active",
    }),
    createdAt: z.string().datetime().openapi({
      description: "Creation timestamp",
      example: "2024-01-15T10:30:00Z",
    }),
    updatedAt: z.string().datetime().openapi({
      description: "Last update timestamp",
      example: "2024-01-15T10:30:00Z",
    }),
  })
  .openapi({ ref: "FeatureResponse" });

export type FeatureResponse = z.infer<typeof FeatureResponseSchema>;

// Transformation function
export function toFeatureDto(feature: Feature): FeatureResponse {
  return {
    id: feature.id,
    name: feature.name,
    status: feature.status,
    createdAt: feature.createdAt.toISOString(),
    updatedAt: feature.updatedAt.toISOString(),
  };
}
```

## Computed Fields Pattern

When the response needs fields derived from database fields:

```typescript
export const UserResponseSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    emailVerified: z.boolean().openapi({
      description: "Whether email is verified",
      example: true,
    }),
    createdAt: z.string().datetime(),
  })
  .openapi({ ref: "UserResponse" });

export type UserResponse = z.infer<typeof UserResponseSchema>;

export function toUserDto(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null, // Computed from timestamp
    createdAt: user.createdAt.toISOString(),
  };
}
```

## Nested Object Pattern

For responses with nested objects:

```typescript
// Nested schema
export const AuthorSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
  })
  .openapi({ ref: "Author" });

// Parent schema referencing nested
export const PostResponseSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    content: z.string(),
    author: AuthorSchema,
    createdAt: z.string().datetime(),
  })
  .openapi({ ref: "PostResponse" });

export type PostResponse = z.infer<typeof PostResponseSchema>;

export function toPostDto(post: PostWithAuthor): PostResponse {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    author: {
      id: post.author.id,
      name: post.author.name,
      email: post.author.email,
    },
    createdAt: post.createdAt.toISOString(),
  };
}
```

## List Response Pattern

For paginated list responses:

```typescript
export const FeatureListResponseSchema = z
  .object({
    items: z.array(FeatureResponseSchema),
    total: z.number().int().openapi({
      description: "Total number of items",
      example: 100,
    }),
    page: z.number().int().openapi({
      description: "Current page number",
      example: 1,
    }),
    pageSize: z.number().int().openapi({
      description: "Items per page",
      example: 10,
    }),
    totalPages: z.number().int().openapi({
      description: "Total number of pages",
      example: 10,
    }),
  })
  .openapi({ ref: "FeatureListResponse" });

export type FeatureListResponse = z.infer<typeof FeatureListResponseSchema>;

export function toFeatureListDto(
  features: Feature[],
  total: number,
  page: number,
  pageSize: number
): FeatureListResponse {
  return {
    items: features.map(toFeatureDto),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
```

## Shared DTO Schemas

Put reusable schemas in `src/shared/dtos/`:

```typescript
// src/shared/dtos/pagination.dto.ts
export const PaginationMetaSchema = z
  .object({
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    totalPages: z.number().int(),
  })
  .openapi({ ref: "PaginationMeta" });

// src/shared/dtos/error.dto.ts
export const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
    }),
  })
  .openapi({ ref: "ErrorResponse" });
```

## Checklist

When creating a DTO:

- [ ] Create Zod schema with `.openapi({ ref: "SchemaName" })`
- [ ] Add `.openapi({ description, example })` to all fields
- [ ] Export TypeScript type with `z.infer<>`
- [ ] Create `to*Dto()` transformation function
- [ ] Handle date conversions (`.toISOString()`)
- [ ] Handle computed fields
- [ ] Use shared schemas from `src/shared/dtos/` where applicable
- [ ] For nested objects, create separate schemas with refs

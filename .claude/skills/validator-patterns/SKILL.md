---
name: validator-patterns
description: Create request validators using Zod schemas for Hono with zod-openapi. Use when creating input validation for API endpoints.
---

# Validator Patterns Skill

This skill guides the creation of request validators using Zod schemas for Hono with zod-openapi.

## Validator Structure

Validators define separate schemas for body, params, and query. These are referenced in route definitions.

```typescript
import { z } from "zod";

// Body schema
export const CreateFeatureBodySchema = z
  .object({
    name: z.string().min(1).max(100).openapi({
      description: "Feature name",
      example: "My Feature",
    }),
    description: z.string().optional().openapi({
      description: "Feature description",
      example: "A detailed description",
    }),
    status: z.enum(["active", "inactive"]).default("active").openapi({
      description: "Initial status",
      example: "active",
    }),
  })
  .openapi({ ref: "CreateFeatureBody" });

export type CreateFeatureBody = z.infer<typeof CreateFeatureBodySchema>;
```

## URL Parameters Validator

```typescript
export const FeatureParamsSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "Feature ID",
      example: "123e4567-e89b-12d3-a456-426614174000",
      param: {
        name: "id",
        in: "path",
      },
    }),
  })
  .openapi({ ref: "FeatureParams" });

export type FeatureParams = z.infer<typeof FeatureParamsSchema>;
```

## Query Parameters Validator

Query parameters come as strings, so use `.coerce` for type conversion:

```typescript
export const ListFeaturesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1).openapi({
      description: "Page number",
      example: 1,
    }),
    pageSize: z.coerce.number().int().min(1).max(100).default(10).openapi({
      description: "Items per page",
      example: 10,
    }),
    search: z.string().optional().openapi({
      description: "Search term",
      example: "feature",
    }),
    status: z.enum(["active", "inactive"]).optional().openapi({
      description: "Filter by status",
      example: "active",
    }),
    sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("createdAt").openapi({
      description: "Sort field",
      example: "createdAt",
    }),
    sortOrder: z.enum(["asc", "desc"]).default("desc").openapi({
      description: "Sort order",
      example: "desc",
    }),
  })
  .openapi({ ref: "ListFeaturesQuery" });

export type ListFeaturesQuery = z.infer<typeof ListFeaturesQuerySchema>;
```

## Update/Patch Validator

For partial updates, use `.partial()`:

```typescript
export const UpdateFeatureBodySchema = z
  .object({
    name: z.string().min(1).max(100).openapi({
      description: "Feature name",
      example: "Updated Feature",
    }),
    description: z.string().openapi({
      description: "Feature description",
      example: "Updated description",
    }),
    status: z.enum(["active", "inactive"]).openapi({
      description: "Feature status",
      example: "inactive",
    }),
  })
  .partial() // All fields optional
  .openapi({ ref: "UpdateFeatureBody" });

export type UpdateFeatureBody = z.infer<typeof UpdateFeatureBodySchema>;
```

## Common Validation Patterns

### Email Validation
```typescript
email: z.string().email().openapi({
  description: "Email address",
  example: "user@example.com",
})
```

### Password Validation
```typescript
password: z.string()
  .min(8, "Password must be at least 8 characters")
  .max(100)
  .regex(/[A-Z]/, "Password must contain uppercase letter")
  .regex(/[a-z]/, "Password must contain lowercase letter")
  .regex(/[0-9]/, "Password must contain number")
  .openapi({
    description: "User password",
    example: "SecurePass123",
  })
```

### UUID Validation
```typescript
id: z.string().uuid().openapi({
  description: "Resource ID",
  example: "123e4567-e89b-12d3-a456-426614174000",
})
```

### Date Validation
```typescript
startDate: z.coerce.date().openapi({
  description: "Start date",
  example: "2024-01-15",
})

// Or as ISO string
createdAfter: z.string().datetime().optional().openapi({
  description: "Filter by creation date",
  example: "2024-01-15T00:00:00Z",
})
```

### Array Validation
```typescript
tags: z.array(z.string()).min(1).max(10).openapi({
  description: "Feature tags",
  example: ["important", "urgent"],
})
```

### Enum Validation
```typescript
role: z.enum(["admin", "manager", "user"]).openapi({
  description: "User role",
  example: "user",
})
```

## Using in Route Definitions

```typescript
import { createRoute } from "@hono/zod-openapi";
import {
  CreateFeatureBodySchema,
  FeatureParamsSchema,
  ListFeaturesQuerySchema
} from "./<feature>.validator";

const createRoute = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateFeatureBodySchema,
        },
      },
    },
  },
  // ...
});

const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  request: {
    params: FeatureParamsSchema,
  },
  // ...
});

const listRoute = createRoute({
  method: "get",
  path: "/",
  request: {
    query: ListFeaturesQuerySchema,
  },
  // ...
});
```

## Accessing Validated Data in Controllers

```typescript
const handler: RouteHandler<typeof createRoute> = async (c) => {
  const body = c.req.valid("json");     // Body data
  const params = c.req.valid("param");   // URL params
  const query = c.req.valid("query");    // Query params

  // All data is typed and validated
};
```

## Shared Validators

Put reusable validators in `src/shared/validators/`:

```typescript
// src/shared/validators/pagination.validator.ts
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

// src/shared/validators/id.validator.ts
export const IdParamsSchema = z.object({
  id: z.string().uuid(),
});
```

## Checklist

When creating validators:
- [ ] Use Zod v4 syntax
- [ ] Add `.openapi({ ref: "SchemaName" })` to root schema
- [ ] Add `.openapi({ description, example })` to all fields
- [ ] Export TypeScript type with `z.infer<>`
- [ ] Use `.min(1)` for required non-empty strings
- [ ] Use `.coerce` for query parameters that need type conversion
- [ ] Use `.optional()` for optional fields
- [ ] Use `.default()` for fields with default values
- [ ] Use `.partial()` for update/patch schemas
- [ ] Check `src/shared/validators/` for reusable schemas

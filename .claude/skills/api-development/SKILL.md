---
name: api-development
description: Develop Hono API endpoints following project patterns. Use when creating routes, controllers, services, or any API endpoint. Covers module-based architecture, zod-openapi patterns, middleware, transaction support, and OpenAPI documentation.
---

# API Development Skill

This skill guides the development of Hono API endpoints with zod-openapi.

## Module Structure

Feature-specific code goes in `src/modules/<feature>/`:

```
src/modules/<feature>/
├── <feature>.route.ts       # OpenAPI route definitions
├── <feature>.controller.ts  # Request handlers
├── <feature>.service.ts     # Business logic
├── <feature>.dto.ts         # Response schemas
└── <feature>.validator.ts   # Request body/query schemas
```

## Route Pattern

```typescript
import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { authMiddleware, type AuthEnv } from "@/middleware/auth.middleware";
import { FeatureResponseSchema } from "./<feature>.dto";
import { CreateFeatureBodySchema, FeatureParamsSchema } from "./<feature>.validator";
import * as controller from "./<feature>.controller";

const app = new OpenAPIHono<AuthEnv>();

// Define route with OpenAPI metadata
const createFeatureRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Feature"],
  summary: "Create a new feature",
  description: "Creates a new feature with the provided data",
  middleware: [authMiddleware] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateFeatureBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: FeatureResponseSchema,
        },
      },
      description: "Feature created successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Validation error",
    },
  },
});

// Route with URL parameters
const getFeatureRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Feature"],
  summary: "Get feature by ID",
  middleware: [authMiddleware] as const,
  request: {
    params: FeatureParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: FeatureResponseSchema,
        },
      },
      description: "Feature found",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Feature not found",
    },
  },
});

// Register routes with handlers
app.openapi(createFeatureRoute, controller.create);
app.openapi(getFeatureRoute, controller.getById);

export default app;
```

## Controller Pattern

```typescript
import type { RouteHandler } from "@hono/zod-openapi";
import type { createFeatureRoute, getFeatureRoute } from "./<feature>.route";
import { featureService } from "./<feature>.service";
import { toFeatureDto } from "./<feature>.dto";

export const create: RouteHandler<typeof createFeatureRoute> = async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user"); // Available after authMiddleware

  const feature = await featureService.create({
    ...body,
    createdById: user.id,
  });

  return c.json(toFeatureDto(feature), 201);
};

export const getById: RouteHandler<typeof getFeatureRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const feature = await featureService.findByIdOrThrow(id);

  return c.json(toFeatureDto(feature));
};
```

## Service Pattern

```typescript
import { prisma } from "@/db";
import type { Prisma } from "@/generated/prisma";
import { NotFound, BadRequest, Conflict } from "@/lib/errors";

class FeatureService {
  async create(data: CreateFeatureData, tx: Prisma.TransactionClient = prisma) {
    return await tx.feature.create({ data });
  }

  async findById(id: string, tx: Prisma.TransactionClient = prisma) {
    return await tx.feature.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string, tx: Prisma.TransactionClient = prisma) {
    const feature = await this.findById(id, tx);
    if (!feature) {
      throw NotFound("Feature not found");
    }
    return feature;
  }

  // Transaction example
  async complexOperation(data: OperationData) {
    return await prisma.$transaction(async (tx) => {
      const feature = await this.create(data, tx);
      await this.otherService.doSomething(feature.id, tx);
      return feature;
    });
  }
}

export const featureService = new FeatureService();
```

## Auth Middleware Pattern

```typescript
// Protected route with authMiddleware
const protectedRoute = createRoute({
  method: "get",
  path: "/protected",
  middleware: [authMiddleware] as const,
  // ...
});

// Role-based access with roleGuard
import { roleGuard } from "@/middleware/auth.middleware";

const adminRoute = createRoute({
  method: "delete",
  path: "/{id}",
  middleware: [authMiddleware, roleGuard("admin", "manager")] as const,
  // ...
});

// In controller, access user and session
const handler: RouteHandler<typeof protectedRoute> = async (c) => {
  const user = c.get("user"); // User object
  const session = c.get("session"); // Session object
  // ...
};
```

## Route Registration in app.ts

```typescript
import featureRoutes from "@/modules/feature/feature.route";

// In createApp() function
app.route("/api/features", featureRoutes);
```

## Error Handling

```typescript
import { NotFound, BadRequest, Unauthorized, Forbidden, Conflict } from "@/lib/errors";

// In service
async findByIdOrThrow(id: string) {
  const item = await this.findById(id);
  if (!item) {
    throw NotFound("Item not found");
  }
  return item;
}

// Validation error
if (!isValid) {
  throw BadRequest("Invalid input");
}

// Authorization
if (item.ownerId !== userId) {
  throw Forbidden("Not authorized to access this resource");
}
```

## Checklist

When creating a new endpoint:

- [ ] Create validator schemas in `<feature>.validator.ts`
- [ ] Create response DTO schemas in `<feature>.dto.ts`
- [ ] Create or update service in `<feature>.service.ts`
- [ ] Define route with `createRoute()` in `<feature>.route.ts`
- [ ] Create handler in `<feature>.controller.ts`
- [ ] Register route with `app.openapi(route, handler)`
- [ ] Register module routes in `app.ts`
- [ ] Add tests in `tests/`

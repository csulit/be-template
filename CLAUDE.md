# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Guidelines

**Verify before assuming.** Always read existing code, configuration files, and documentation before making changes. When unsure about patterns, APIs, or configurations:
1. Search the codebase for existing examples
2. Read the relevant source files
3. Check official documentation if needed

Never generate code based on assumptions about how libraries work. If you don't know the exact API, research it first.

## Commands

```bash
# Development
pnpm dev              # Start dev server with hot reload
pnpm build            # Compile TypeScript
pnpm typecheck        # Type check without emitting

# Database (PostgreSQL via Docker)
pnpm db:generate      # Generate Prisma client after schema changes
pnpm db:migrate       # Create and run migrations
pnpm db:push          # Push schema changes (no migration file)
pnpm db:studio        # Open Prisma Studio GUI

# Testing
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once (CI)
vitest run tests/integration/routes/health.test.ts  # Single file
vitest run --grep "FeatureService"                  # Pattern match

# Code Quality
pnpm lint             # ESLint check
pnpm lint:fix         # ESLint with auto-fix
pnpm format           # Prettier format
pnpm format:check     # Check formatting
```

## Architecture

### Stack
- **Hono** with zod-openapi for type-safe routes and auto-generated OpenAPI docs
- **Prisma** with PostgreSQL (pg adapter)
- **better-auth** for session-based authentication
- **Zod** for all validation (request/response schemas)
- **Vitest** for testing with hono/testing client

### Module Structure

Each feature lives in `src/modules/<feature>/`:
```
<feature>.route.ts       # OpenAPI route definitions with createRoute()
<feature>.controller.ts  # Thin handlers that call services
<feature>.service.ts     # Business logic with Prisma operations
<feature>.dto.ts         # Response Zod schemas with .openapi() metadata
<feature>.validator.ts   # Request body/params/query Zod schemas
```

### Key Patterns

**Routes use createRoute() with full OpenAPI metadata:**
```typescript
const route = createRoute({
  method: "post",
  path: "/",
  tags: ["Feature"],
  middleware: [authMiddleware] as const,
  request: { body: { content: { "application/json": { schema: BodySchema } } } },
  responses: { 201: { content: { "application/json": { schema: ResponseSchema } } } },
});
app.openapi(route, controller.handler);
```

**Controllers are thin, type-safe handlers:**
```typescript
export const handler: RouteHandler<typeof route> = async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");
  const result = await service.create(body, user.id);
  return c.json(toDto(result), 201);
};
```

**Services accept optional transaction client:**
```typescript
async create(data: CreateData, tx: Prisma.TransactionClient = prisma) {
  return await tx.feature.create({ data });
}
```

**DTOs transform database models to API responses:**
```typescript
export const FeatureSchema = z.object({
  id: z.string().uuid().openapi({ example: "..." }),
  createdAt: z.string().datetime(),
}).openapi({ ref: "Feature" });

export function toFeatureDto(model: Feature): z.infer<typeof FeatureSchema> {
  return { id: model.id, createdAt: model.createdAt.toISOString() };
}
```

### Error Handling

Use error factories from `src/lib/errors.ts`:
```typescript
import { NotFound, BadRequest, Forbidden, Conflict } from "@/lib/errors";

if (!item) throw NotFound("Item not found");
if (item.userId !== userId) throw Forbidden("Not authorized");
```

### Authentication

Protected routes use `authMiddleware`, role-based access uses `roleGuard`:
```typescript
middleware: [authMiddleware] as const,  // Requires session
middleware: [authMiddleware, roleGuard("admin")] as const,  // Requires admin role
```

In controllers: `c.get("user")` and `c.get("session")` are available after authMiddleware.

### Imports

Use path alias `@/` for src directory:
```typescript
import { prisma } from "@/db";
import { NotFound } from "@/lib/errors";
import type { Prisma } from "@/generated/prisma";
```

## Database

- Prisma schema: `prisma/schema.prisma`
- Generated client: `src/generated/prisma/`
- Always run `pnpm db:generate` after schema changes
- Use transactions via `prisma.$transaction()` for multi-step operations

## Testing

- Integration tests: `tests/integration/routes/` - use `createTestClient()` from `tests/helpers/test-client.ts`
- Unit tests: `tests/unit/` - mock Prisma with `vi.mock("@/db")`
- Setup file: `tests/setup.ts`

## OpenAPI

- Schema at `/openapi.json`
- Swagger UI at `/docs` (development only)
- All schemas need `.openapi({ ref: "Name" })` for proper documentation

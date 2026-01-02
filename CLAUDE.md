# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev              # Start dev server with hot reload (tsx watch)
pnpm build            # TypeScript compilation to dist/
pnpm start            # Run compiled code from dist/

# Database (Prisma with PostgreSQL)
pnpm db:generate      # Generate Prisma client after schema changes
pnpm db:migrate       # Create and apply migrations
pnpm db:push          # Push schema changes without migration (dev only)
pnpm db:studio        # Open Prisma Studio GUI

# Testing
pnpm test             # Run vitest in watch mode
pnpm test:run         # Run tests once
vitest run tests/integration/routes/health.test.ts  # Run single test file

# Code Quality
pnpm typecheck        # Type check without emitting
pnpm lint             # ESLint check
pnpm lint:fix         # ESLint with auto-fix
pnpm format           # Prettier format
```

## Architecture

### Stack

- **Framework**: Hono with OpenAPI (zod-openapi) running on Node.js
- **Auth**: better-auth with Prisma adapter (email/password + optional Google OAuth)
- **Database**: PostgreSQL via Prisma ORM with `@prisma/adapter-pg`
- **Validation**: Zod v4 (schemas double as OpenAPI definitions)

### Project Structure

```
src/
├── index.ts           # Server entry point with graceful shutdown
├── app.ts             # Hono app factory with middleware stack
├── db.ts              # Prisma client singleton
├── env.ts             # Zod-validated environment variables
├── lib/
│   ├── auth.ts        # better-auth configuration
│   ├── openapi.ts     # Swagger UI setup
│   └── errors.ts      # AppError class and factory functions
├── middleware/
│   ├── auth.middleware.ts    # Session validation + roleGuard()
│   ├── error.middleware.ts   # Global error handler (Zod, AppError, HTTPException)
│   └── rate-limit.middleware.ts
├── modules/           # Feature modules (route → controller → service pattern)
│   └── {module}/
│       ├── {module}.route.ts       # OpenAPI route definitions
│       ├── {module}.controller.ts  # Request handlers
│       ├── {module}.service.ts     # Business logic
│       ├── {module}.dto.ts         # Response schemas
│       └── {module}.validator.ts   # Request body/query schemas
├── shared/
│   ├── dtos/          # Reusable response schemas (pagination, errors)
│   ├── validators/    # Reusable request validators
│   └── utils/         # Helper functions
├── providers/         # External service wrappers (email, SMS, storage)
└── generated/prisma/  # Auto-generated Prisma client (don't edit)

prisma/
├── schema.prisma      # Database schema
└── prisma.config.ts   # Prisma config with pg adapter
```

### Key Patterns

**Adding a new module:**

1. Create folder in `src/modules/{name}/`
2. Define Zod schemas in `validator.ts` (request) and `dto.ts` (response)
3. Create routes using `createRoute()` from `@hono/zod-openapi` in `route.ts`
4. Implement handlers in `controller.ts` with type `RouteHandler<RouteType>`
5. Put business logic in `service.ts` as a class instance export
6. Register routes in `app.ts`: `app.route("/api/{name}", routes)`

**Route definition pattern:**

```typescript
const myRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Tag"],
  middleware: [authMiddleware] as const,
  request: { body: { content: { "application/json": { schema: MySchema } } } },
  responses: { 200: { content: { "application/json": { schema: ResponseSchema } } } },
});
app.openapi(myRoute, handler);
```

**Auth middleware types:**

- `AuthEnv` - Provides `c.get("user")` and `c.get("session")` after `authMiddleware`
- `roleGuard("admin", "manager")` - Role-based access control

**Error handling:**

- Use factory functions from `lib/errors.ts`: `NotFound()`, `BadRequest()`, `Unauthorized()`, `Forbidden()`, `Conflict()`
- All errors flow through `errorHandler` in `error.middleware.ts`

**Environment variables:**

- Defined and validated in `src/env.ts` using Zod
- Required: `DATABASE_URL`, `BASE_URL`, `AUTH_SECRET` (min 32 chars)
- Optional: `GOOGLE_CLIENT_ID/SECRET`, `SENTRY_DSN`, AWS/Twilio configs

### Testing

Tests use Vitest with `hono/testing` client:

```typescript
import { createTestClient } from "../../helpers/test-client.js";
const client = createTestClient();
const res = await client.health.$get();
```

Test structure mirrors source: `tests/unit/` and `tests/integration/`

### ESLint Rules

- Prefer type imports: `import type { Foo }` or `import { type Foo }`
- Unused vars allowed if prefixed with `_`
- `no-explicit-any` is warning (not error)

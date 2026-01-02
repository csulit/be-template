---
name: testing-patterns
description: Write unit and integration tests following project patterns. Covers Vitest patterns, hono/testing client, mocking strategies, and test structure.
---

# Testing Patterns Skill

This skill guides the creation of tests using Vitest with `hono/testing`.

## Test Structure

```
tests/
├── helpers/
│   └── test-client.ts      # Test client factory
├── unit/
│   └── modules/
│       └── <feature>/
│           └── <feature>.service.test.ts
└── integration/
    └── routes/
        └── <feature>.test.ts
```

## Integration Test Pattern

Integration tests use the `hono/testing` client to test endpoints:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestClient } from "../../helpers/test-client";

describe("Feature Routes", () => {
  const client = createTestClient();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/features", () => {
    it("should return list of features", async () => {
      const res = await client.api.features.$get();

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty("items");
      expect(Array.isArray(data.items)).toBe(true);
    });

    it("should support pagination", async () => {
      const res = await client.api.features.$get({
        query: { page: "1", pageSize: "5" },
      });

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.page).toBe(1);
      expect(data.pageSize).toBe(5);
    });
  });

  describe("GET /api/features/:id", () => {
    it("should return feature by id", async () => {
      const featureId = "123e4567-e89b-12d3-a456-426614174000";

      const res = await client.api.features[":id"].$get({
        param: { id: featureId },
      });

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBe(featureId);
    });

    it("should return 404 for non-existent feature", async () => {
      const res = await client.api.features[":id"].$get({
        param: { id: "non-existent-id" },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/features", () => {
    it("should create a new feature", async () => {
      const res = await client.api.features.$post({
        json: {
          name: "Test Feature",
          description: "Test description",
        },
      });

      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.name).toBe("Test Feature");
      expect(data.id).toBeDefined();
    });

    it("should return 400 for invalid input", async () => {
      const res = await client.api.features.$post({
        json: {
          name: "", // Invalid: empty name
        },
      });

      expect(res.status).toBe(400);
    });
  });
});
```

## Unit Test Pattern (Services)

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { FeatureService } from "@/modules/feature/feature.service";

// Mock Prisma
vi.mock("@/db", () => ({
  prisma: {
    feature: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn(prisma)),
  },
}));

import { prisma } from "@/db";

describe("FeatureService", () => {
  let service: FeatureService;

  const mockFeature = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Test Feature",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = new FeatureService();
    vi.clearAllMocks();
  });

  describe("findById", () => {
    it("should return feature when found", async () => {
      vi.mocked(prisma.feature.findUnique).mockResolvedValue(mockFeature);

      const result = await service.findById(mockFeature.id);

      expect(result).toEqual(mockFeature);
      expect(prisma.feature.findUnique).toHaveBeenCalledWith({
        where: { id: mockFeature.id },
      });
    });

    it("should return null when not found", async () => {
      vi.mocked(prisma.feature.findUnique).mockResolvedValue(null);

      const result = await service.findById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("findByIdOrThrow", () => {
    it("should return feature when found", async () => {
      vi.mocked(prisma.feature.findUnique).mockResolvedValue(mockFeature);

      const result = await service.findByIdOrThrow(mockFeature.id);

      expect(result).toEqual(mockFeature);
    });

    it("should throw NotFound when not found", async () => {
      vi.mocked(prisma.feature.findUnique).mockResolvedValue(null);

      await expect(service.findByIdOrThrow("bad-id")).rejects.toThrow();
    });
  });

  describe("create", () => {
    it("should create and return feature", async () => {
      const createData = { name: "New Feature" };
      vi.mocked(prisma.feature.create).mockResolvedValue({
        ...mockFeature,
        ...createData,
      });

      const result = await service.create(createData);

      expect(result.name).toBe(createData.name);
      expect(prisma.feature.create).toHaveBeenCalledWith({
        data: createData,
      });
    });
  });
});
```

## Mocking Patterns

### Mock External Services
```typescript
vi.mock("@/providers/email", () => ({
  emailProvider: {
    send: vi.fn().mockResolvedValue({ success: true }),
  },
}));
```

### Mock Auth Middleware
```typescript
// For protected routes in integration tests
vi.mock("@/middleware/auth.middleware", () => ({
  authMiddleware: vi.fn((c, next) => next()),
}));
```

### Spy on Methods
```typescript
const createSpy = vi.spyOn(featureService, "create");
createSpy.mockResolvedValue(mockFeature);

// After test
expect(createSpy).toHaveBeenCalledWith(expectedData);
```

## Test Helpers

### Test Client Factory
```typescript
// tests/helpers/test-client.ts
import { testClient } from "hono/testing";
import { createApp } from "@/app";

export function createTestClient() {
  const app = createApp();
  return testClient(app);
}
```

### Mock Data Factories
```typescript
// tests/helpers/factories.ts
export function createMockFeature(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: "Test Feature",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

## Running Tests

```bash
# Run all tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run specific test file
vitest run tests/integration/routes/feature.test.ts

# Run tests matching pattern
pnpm test:run -- --grep "FeatureService"

# Run with coverage
pnpm test:run -- --coverage
```

## Checklist

When writing tests:
- [ ] Use `describe` blocks to organize by class/route
- [ ] Use nested `describe` for methods/endpoints
- [ ] Clear mocks in `beforeEach` with `vi.clearAllMocks()`
- [ ] Test success cases
- [ ] Test error/edge cases (not found, validation, auth)
- [ ] Use `vi.mock()` for external dependencies
- [ ] Use `vi.spyOn()` for method mocks
- [ ] Use factories for mock data
- [ ] Assert both status codes and response body
- [ ] Use `createTestClient()` for integration tests

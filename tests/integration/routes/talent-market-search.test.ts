import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

const { orgMiddlewareMock } = vi.hoisted(() => ({
  orgMiddlewareMock: vi.fn(
    async (c: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
      c.set("member", {
        id: "clxmember000000000001",
        organizationId: "clxorg0000000000001",
        userId: "clxuser00000000000001",
        role: "admin",
        createdAt: new Date("2024-01-15T10:30:00.000Z"),
      });
      c.set("organizationId", "clxorg0000000000001");
      return next();
    }
  ),
}));

vi.mock("../../../src/middleware/auth.middleware.js", () => ({
  authMiddleware: vi.fn(
    async (c: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
      c.set("user", { id: "clxuser00000000000001", email: "test@example.com", role: "admin" });
      c.set("session", { id: "session_1" });
      return next();
    }
  ),
  roleGuard: vi.fn(() => async (_c: unknown, next: () => Promise<void>) => next()),
}));

vi.mock("../../../src/middleware/org.middleware.js", () => ({
  orgGuard: vi.fn(() => orgMiddlewareMock),
}));

vi.mock("../../../src/db.js", () => ({
  prisma: {
    tmsMarketScopeSearch: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "../../../src/db.js";
import { Forbidden } from "../../../src/lib/errors.js";
import { createTestClient } from "../../helpers/test-client.js";

describe("TMS Market Scope Search Routes", () => {
  let client: ReturnType<typeof createTestClient>;

  const mockOrganizationId = "clxorg0000000000001";
  const mockUserId = "clxuser00000000000001";

  const mockCreatedBy = {
    id: mockUserId,
    name: "Test User",
    email: "test@example.com",
  };

  const mockMarketScopeSearch = {
    id: "clxmss0000000000001",
    clientName: "Acme Corp",
    jobTitle: "Senior Developer",
    budgetMinMax: "100000-150000",
    intCurrency: "USD",
    experienceScope: "5-10 years",
    locationScope: "Remote",
    willingToRelocate: false,
    cvKeywordsBooleanSearch: "typescript AND react",
    salaryFilter: "100000+",
    workTypes: "full-time",
    isApproachable: true,
    hasCv: true,
    isProcessed: false,
    createdById: mockUserId,
    organizationId: mockOrganizationId,
    createdAt: new Date("2024-01-15T10:30:00.000Z"),
    updatedAt: new Date("2024-01-15T10:30:00.000Z"),
    createdBy: mockCreatedBy,
  };

  beforeAll(() => {
    client = createTestClient();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    orgMiddlewareMock.mockImplementation(
      async (c: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
        c.set("member", {
          id: "clxmember000000000001",
          organizationId: mockOrganizationId,
          userId: mockUserId,
          role: "admin",
          createdAt: new Date("2024-01-15T10:30:00.000Z"),
        });
        c.set("organizationId", mockOrganizationId);
        return next();
      }
    );
  });

  describe("GET /api/tms/market-scope-searches", () => {
    it("should return paginated list of market scope searches", async () => {
      vi.mocked(prisma.tmsMarketScopeSearch.findMany).mockResolvedValue([
        mockMarketScopeSearch,
      ] as never);
      vi.mocked(prisma.tmsMarketScopeSearch.count).mockResolvedValue(1);

      const res = await client.api.tms["market-scope-searches"].$get({
        query: { page: "1", pageSize: "20", organizationId: mockOrganizationId },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.any(Array),
        meta: expect.objectContaining({
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        }),
      });
      expect(json.data).toHaveLength(1);
      expect(json.data[0]).toMatchObject({
        id: "clxmss0000000000001",
        clientName: "Acme Corp",
        jobTitle: "Senior Developer",
        budgetMinMax: "100000-150000",
        intCurrency: "USD",
        experienceScope: "5-10 years",
        locationScope: "Remote",
        willingToRelocate: false,
        cvKeywordsBooleanSearch: "typescript AND react",
        salaryFilter: "100000+",
        workTypes: "full-time",
        isApproachable: true,
        hasCv: true,
        isProcessed: false,
        createdById: mockUserId,
        organizationId: mockOrganizationId,
        createdBy: {
          id: mockUserId,
          name: "Test User",
          email: "test@example.com",
        },
      });
    });

    it("should filter by organizationId", async () => {
      vi.mocked(prisma.tmsMarketScopeSearch.findMany).mockResolvedValue([
        mockMarketScopeSearch,
      ] as never);
      vi.mocked(prisma.tmsMarketScopeSearch.count).mockResolvedValue(1);

      const res = await client.api.tms["market-scope-searches"].$get({
        query: { page: "1", pageSize: "20", organizationId: mockOrganizationId },
      });

      expect(res.status).toBe(200);
      expect(prisma.tmsMarketScopeSearch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: mockOrganizationId }),
        })
      );
    });

    it("should return empty list when no records exist", async () => {
      vi.mocked(prisma.tmsMarketScopeSearch.findMany).mockResolvedValue([]);
      vi.mocked(prisma.tmsMarketScopeSearch.count).mockResolvedValue(0);

      const res = await client.api.tms["market-scope-searches"].$get({
        query: { page: "1", pageSize: "20", organizationId: mockOrganizationId },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
      expect(json.meta.totalItems).toBe(0);
    });

    it("should handle pagination metadata", async () => {
      vi.mocked(prisma.tmsMarketScopeSearch.findMany).mockResolvedValue([
        mockMarketScopeSearch,
      ] as never);
      vi.mocked(prisma.tmsMarketScopeSearch.count).mockResolvedValue(50);

      const res = await client.api.tms["market-scope-searches"].$get({
        query: { page: "3", pageSize: "10", organizationId: mockOrganizationId },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.meta).toMatchObject({
        page: 3,
        pageSize: 10,
        totalItems: 50,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it("should use default pagination values", async () => {
      vi.mocked(prisma.tmsMarketScopeSearch.findMany).mockResolvedValue([]);
      vi.mocked(prisma.tmsMarketScopeSearch.count).mockResolvedValue(0);

      const res = await client.api.tms["market-scope-searches"].$get({
        query: { organizationId: mockOrganizationId },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.meta.page).toBe(1);
      expect(json.meta.pageSize).toBe(20);
    });
  });

  describe("POST /api/tms/market-scope-searches", () => {
    const validCreateBody = {
      jobTitle: "Senior Developer",
      budgetMinMax: "100000-150000",
      intCurrency: "USD",
      experienceScope: "5-10 years",
      locationScope: "Remote",
      willingToRelocate: false,
      cvKeywordsBooleanSearch: "typescript AND react",
      salaryFilter: "100000+",
      workTypes: "full-time",
      isApproachable: true,
      hasCv: true,
      organizationId: mockOrganizationId,
    };

    it("should create a new market scope search", async () => {
      vi.mocked(prisma.tmsMarketScopeSearch.create).mockResolvedValue(
        mockMarketScopeSearch as never
      );

      const res = await client.api.tms["market-scope-searches"].$post({
        json: validCreateBody,
      });

      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxmss0000000000001",
          jobTitle: "Senior Developer",
          budgetMinMax: "100000-150000",
          intCurrency: "USD",
          experienceScope: "5-10 years",
          locationScope: "Remote",
          willingToRelocate: false,
          cvKeywordsBooleanSearch: "typescript AND react",
          salaryFilter: "100000+",
          workTypes: "full-time",
          isApproachable: true,
          hasCv: true,
          isProcessed: false,
          organizationId: mockOrganizationId,
        }),
      });
    });

    it("should set createdById from authenticated user", async () => {
      vi.mocked(prisma.tmsMarketScopeSearch.create).mockResolvedValue(
        mockMarketScopeSearch as never
      );

      const res = await client.api.tms["market-scope-searches"].$post({
        json: validCreateBody,
      });

      expect(res.status).toBe(201);
      expect(prisma.tmsMarketScopeSearch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdById: mockUserId,
          }),
        })
      );
    });

    it("should set isProcessed to false by default", async () => {
      vi.mocked(prisma.tmsMarketScopeSearch.create).mockResolvedValue(
        mockMarketScopeSearch as never
      );

      const res = await client.api.tms["market-scope-searches"].$post({
        json: validCreateBody,
      });

      expect(res.status).toBe(201);
      expect(prisma.tmsMarketScopeSearch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isProcessed: false,
          }),
        })
      );

      const json = await res.json();
      expect(json.data.isProcessed).toBe(false);
    });

    it("should create with optional clientName", async () => {
      const bodyWithClientName = {
        ...validCreateBody,
        clientName: "Acme Corp",
      };

      vi.mocked(prisma.tmsMarketScopeSearch.create).mockResolvedValue(
        mockMarketScopeSearch as never
      );

      const res = await client.api.tms["market-scope-searches"].$post({
        json: bodyWithClientName,
      });

      expect(res.status).toBe(201);
      expect(prisma.tmsMarketScopeSearch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientName: "Acme Corp",
          }),
        })
      );
    });

    it("should return 400 for invalid body - missing required fields", async () => {
      const res = await client.api.tms["market-scope-searches"].$post({
        json: {
          // Missing all required fields
          organizationId: mockOrganizationId,
        } as never,
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid body - empty jobTitle", async () => {
      const res = await client.api.tms["market-scope-searches"].$post({
        json: {
          ...validCreateBody,
          jobTitle: "",
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid organizationId format", async () => {
      const res = await client.api.tms["market-scope-searches"].$post({
        json: {
          ...validCreateBody,
          organizationId: "invalid-id",
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("Organization membership enforcement", () => {
    it("should return 403 when orgGuard rejects a list request", async () => {
      orgMiddlewareMock.mockImplementationOnce(async () => {
        throw Forbidden("Not a member of this organization");
      });

      vi.mocked(prisma.tmsMarketScopeSearch.findMany).mockResolvedValue([]);
      vi.mocked(prisma.tmsMarketScopeSearch.count).mockResolvedValue(0);

      const res = await client.api.tms["market-scope-searches"].$get({
        query: { page: "1", pageSize: "20", organizationId: mockOrganizationId },
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("should return 403 when orgGuard rejects a create request due to insufficient role", async () => {
      orgMiddlewareMock.mockImplementationOnce(async () => {
        throw Forbidden("Insufficient organization role");
      });

      const res = await client.api.tms["market-scope-searches"].$post({
        json: {
          jobTitle: "Senior Developer",
          budgetMinMax: "100000-150000",
          intCurrency: "USD",
          experienceScope: "5-10 years",
          locationScope: "Remote",
          willingToRelocate: false,
          cvKeywordsBooleanSearch: "typescript AND react",
          salaryFilter: "100000+",
          workTypes: "full-time",
          isApproachable: true,
          hasCv: true,
          organizationId: mockOrganizationId,
        },
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });
});

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
    reimbursementUser: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    reimbursementType: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    reimbursementRole: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    reimbursementTypeCategory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { createTestClient } from "../../helpers/test-client.js";
import { prisma } from "../../../src/db.js";
import { AppError, ErrorCode } from "../../../src/lib/errors.js";

describe("Reimbursement Routes", () => {
  let client: ReturnType<typeof createTestClient>;

  const mockOrganizationId = "clxorg0000000000001";

  const mockReimbursementRole = {
    id: "clxrole0000000000001",
    name: "Employee",
    organizationId: mockOrganizationId,
    createdAt: new Date("2024-01-15T10:30:00.000Z"),
    updatedAt: new Date("2024-01-15T10:30:00.000Z"),
  };

  const mockReimbursementTypeCategory = {
    id: "clxcat00000000000001",
    name: "Scheduled",
    organizationId: mockOrganizationId,
    createdAt: new Date("2024-01-15T10:30:00.000Z"),
    updatedAt: new Date("2024-01-15T10:30:00.000Z"),
  };

  const mockUser = {
    id: "clxuser00000000000001",
    name: "Test User",
    email: "test@example.com",
  };

  const mockReimbursementUser = {
    id: "clx1234567890abcdef1",
    userId: "clxuser00000000000001",
    roleId: "clxrole0000000000001",
    organizationId: mockOrganizationId,
    createdAt: new Date("2024-01-15T10:30:00.000Z"),
    updatedAt: new Date("2024-01-15T10:30:00.000Z"),
    user: mockUser,
    role: mockReimbursementRole,
  };

  const mockReimbursementType = {
    id: "clx1234567890abcdef2",
    name: "Transportation",
    description: "Transportation expenses",
    organizationId: mockOrganizationId,
    categoryId: "clxcat00000000000001",
    createdAt: new Date("2024-01-15T10:30:00.000Z"),
    updatedAt: new Date("2024-01-15T10:30:00.000Z"),
    category: mockReimbursementTypeCategory,
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
          userId: "clxuser00000000000001",
          role: "admin",
          createdAt: new Date("2024-01-15T10:30:00.000Z"),
        });
        c.set("organizationId", mockOrganizationId);
        return next();
      }
    );
  });

  // ==========================================================================
  // Reimbursement Users
  // ==========================================================================

  describe("GET /api/reimbursement/users", () => {
    it("should return paginated users list", async () => {
      vi.mocked(prisma.reimbursementUser.findMany).mockResolvedValue([
        mockReimbursementUser,
      ] as never);
      vi.mocked(prisma.reimbursementUser.count).mockResolvedValue(1);

      const res = await client.api.reimbursement.users.$get({
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
        id: "clx1234567890abcdef1",
        userId: "clxuser00000000000001",
        roleId: "clxrole0000000000001",
        organizationId: mockOrganizationId,
        role: {
          id: "clxrole0000000000001",
          name: "Employee",
          organizationId: mockOrganizationId,
        },
        user: {
          id: "clxuser00000000000001",
          name: "Test User",
          email: "test@example.com",
        },
      });
    });

    it("should return empty list when no users exist", async () => {
      vi.mocked(prisma.reimbursementUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.reimbursementUser.count).mockResolvedValue(0);

      const res = await client.api.reimbursement.users.$get({
        query: { page: "1", pageSize: "20", organizationId: mockOrganizationId },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
      expect(json.meta.totalItems).toBe(0);
    });

    it("should filter by roleId", async () => {
      vi.mocked(prisma.reimbursementUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.reimbursementUser.count).mockResolvedValue(0);

      const res = await client.api.reimbursement.users.$get({
        query: {
          page: "1",
          pageSize: "20",
          organizationId: mockOrganizationId,
          roleId: "clxrole0000000000001",
        },
      });

      expect(res.status).toBe(200);
      expect(prisma.reimbursementUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ roleId: "clxrole0000000000001" }),
        })
      );
    });

    it("should handle pagination metadata", async () => {
      vi.mocked(prisma.reimbursementUser.findMany).mockResolvedValue([
        mockReimbursementUser,
      ] as never);
      vi.mocked(prisma.reimbursementUser.count).mockResolvedValue(50);

      const res = await client.api.reimbursement.users.$get({
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
      vi.mocked(prisma.reimbursementUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.reimbursementUser.count).mockResolvedValue(0);

      const res = await client.api.reimbursement.users.$get({
        query: { organizationId: mockOrganizationId },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.meta.page).toBe(1);
      expect(json.meta.pageSize).toBe(20);
    });
  });

  describe("GET /api/reimbursement/users/:id", () => {
    it("should return user by id", async () => {
      vi.mocked(prisma.reimbursementUser.findUnique).mockResolvedValue(
        mockReimbursementUser as never
      );

      const res = await client.api.reimbursement.users[":id"].$get({
        param: { id: "clx1234567890abcdef1" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clx1234567890abcdef1",
          userId: "clxuser00000000000001",
          roleId: "clxrole0000000000001",
          organizationId: mockOrganizationId,
          role: expect.objectContaining({
            id: "clxrole0000000000001",
            name: "Employee",
            organizationId: mockOrganizationId,
          }),
          user: expect.objectContaining({
            id: "clxuser00000000000001",
            name: "Test User",
            email: "test@example.com",
          }),
        }),
      });
    });

    it("should return 404 for non-existent user", async () => {
      vi.mocked(prisma.reimbursementUser.findUnique).mockResolvedValue(null);

      const res = await client.api.reimbursement.users[":id"].$get({
        param: { id: "clx9999999999nonexist" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  describe("POST /api/reimbursement/users", () => {
    it("should create reimbursement user", async () => {
      vi.mocked(prisma.reimbursementUser.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.reimbursementUser.create).mockResolvedValue(mockReimbursementUser as never);

      const res = await client.api.reimbursement.users.$post({
        json: {
          userId: "clxuser00000000000001",
          roleId: "clxrole0000000000001",
          organizationId: mockOrganizationId,
        },
      });

      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clx1234567890abcdef1",
          userId: "clxuser00000000000001",
          roleId: "clxrole0000000000001",
          organizationId: mockOrganizationId,
        }),
      });
    });

    it("should return 409 for duplicate user-role assignment", async () => {
      vi.mocked(prisma.reimbursementUser.findUnique).mockResolvedValue(
        mockReimbursementUser as never
      );

      const res = await client.api.reimbursement.users.$post({
        json: {
          userId: "clxuser00000000000001",
          roleId: "clxrole0000000000001",
          organizationId: mockOrganizationId,
        },
      });

      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  describe("PATCH /api/reimbursement/users/:id", () => {
    it("should update user role", async () => {
      const newRoleId = "clxrole0000000000002";
      const updatedUser = {
        ...mockReimbursementUser,
        roleId: newRoleId,
        role: { ...mockReimbursementRole, id: newRoleId, name: "Manager" },
      };
      vi.mocked(prisma.reimbursementUser.findUnique)
        .mockResolvedValueOnce(mockReimbursementUser as never)
        .mockResolvedValueOnce(null as never);
      vi.mocked(prisma.reimbursementUser.update).mockResolvedValue(updatedUser as never);

      const res = await client.api.reimbursement.users[":id"].$patch({
        param: { id: "clx1234567890abcdef1" },
        json: { roleId: newRoleId },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clx1234567890abcdef1",
          roleId: newRoleId,
        }),
      });
    });

    it("should return 404 for non-existent user", async () => {
      vi.mocked(prisma.reimbursementUser.findUnique).mockResolvedValue(null);

      const res = await client.api.reimbursement.users[":id"].$patch({
        param: { id: "clx9999999999nonexist" },
        json: { roleId: "clxrole0000000000002" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("should return 409 when target role already assigned", async () => {
      const newRoleId = "clxrole0000000000002";
      const existingConflict = {
        ...mockReimbursementUser,
        id: "clx_other",
        roleId: newRoleId,
      };
      vi.mocked(prisma.reimbursementUser.findUnique)
        .mockResolvedValueOnce(mockReimbursementUser as never)
        .mockResolvedValueOnce(existingConflict as never);

      const res = await client.api.reimbursement.users[":id"].$patch({
        param: { id: "clx1234567890abcdef1" },
        json: { roleId: newRoleId },
      });

      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("should handle empty update body", async () => {
      vi.mocked(prisma.reimbursementUser.findUnique).mockResolvedValue(
        mockReimbursementUser as never
      );
      vi.mocked(prisma.reimbursementUser.update).mockResolvedValue(mockReimbursementUser as never);

      const res = await client.api.reimbursement.users[":id"].$patch({
        param: { id: "clx1234567890abcdef1" },
        json: {},
      });

      expect(res.status).toBe(200);
    });
  });

  describe("DELETE /api/reimbursement/users/:id", () => {
    it("should delete reimbursement user", async () => {
      vi.mocked(prisma.reimbursementUser.findUnique).mockResolvedValue(
        mockReimbursementUser as never
      );
      vi.mocked(prisma.reimbursementUser.delete).mockResolvedValue(mockReimbursementUser as never);

      const res = await client.api.reimbursement.users[":id"].$delete({
        param: { id: "clx1234567890abcdef1" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should return 404 for non-existent user", async () => {
      vi.mocked(prisma.reimbursementUser.findUnique).mockResolvedValue(null);

      const res = await client.api.reimbursement.users[":id"].$delete({
        param: { id: "clx9999999999nonexist" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================================================
  // Reimbursement Types
  // ==========================================================================

  describe("GET /api/reimbursement/types", () => {
    it("should return paginated types list", async () => {
      vi.mocked(prisma.reimbursementType.findMany).mockResolvedValue([
        mockReimbursementType,
      ] as never);
      vi.mocked(prisma.reimbursementType.count).mockResolvedValue(1);

      const res = await client.api.reimbursement.types.$get({
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
        id: "clx1234567890abcdef2",
        name: "Transportation",
        description: "Transportation expenses",
        organizationId: mockOrganizationId,
        categoryId: "clxcat00000000000001",
        category: {
          id: "clxcat00000000000001",
          name: "Scheduled",
          organizationId: mockOrganizationId,
        },
      });
    });

    it("should return empty list when no types exist", async () => {
      vi.mocked(prisma.reimbursementType.findMany).mockResolvedValue([]);
      vi.mocked(prisma.reimbursementType.count).mockResolvedValue(0);

      const res = await client.api.reimbursement.types.$get({
        query: { page: "1", pageSize: "20", organizationId: mockOrganizationId },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
      expect(json.meta.totalItems).toBe(0);
    });

    it("should filter by categoryId", async () => {
      vi.mocked(prisma.reimbursementType.findMany).mockResolvedValue([]);
      vi.mocked(prisma.reimbursementType.count).mockResolvedValue(0);

      const res = await client.api.reimbursement.types.$get({
        query: {
          page: "1",
          pageSize: "20",
          organizationId: mockOrganizationId,
          categoryId: "clxcat00000000000001",
        },
      });

      expect(res.status).toBe(200);
      expect(prisma.reimbursementType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: "clxcat00000000000001" }),
        })
      );
    });

    it("should use default pagination values", async () => {
      vi.mocked(prisma.reimbursementType.findMany).mockResolvedValue([]);
      vi.mocked(prisma.reimbursementType.count).mockResolvedValue(0);

      const res = await client.api.reimbursement.types.$get({
        query: { organizationId: mockOrganizationId },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.meta.page).toBe(1);
      expect(json.meta.pageSize).toBe(20);
    });
  });

  describe("GET /api/reimbursement/types/:id", () => {
    it("should return type by id", async () => {
      vi.mocked(prisma.reimbursementType.findUnique).mockResolvedValue(
        mockReimbursementType as never
      );

      const res = await client.api.reimbursement.types[":id"].$get({
        param: { id: "clx1234567890abcdef2" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clx1234567890abcdef2",
          name: "Transportation",
          description: "Transportation expenses",
          organizationId: mockOrganizationId,
          categoryId: "clxcat00000000000001",
          category: expect.objectContaining({
            id: "clxcat00000000000001",
            name: "Scheduled",
          }),
        }),
      });
    });

    it("should return 404 for non-existent type", async () => {
      vi.mocked(prisma.reimbursementType.findUnique).mockResolvedValue(null);

      const res = await client.api.reimbursement.types[":id"].$get({
        param: { id: "clx9999999999nonexist" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  describe("POST /api/reimbursement/types", () => {
    it("should create reimbursement type", async () => {
      vi.mocked(prisma.reimbursementType.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.reimbursementType.create).mockResolvedValue(mockReimbursementType as never);

      const res = await client.api.reimbursement.types.$post({
        json: {
          name: "Transportation",
          description: "Transportation expenses",
          organizationId: mockOrganizationId,
          categoryId: "clxcat00000000000001",
        },
      });

      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clx1234567890abcdef2",
          name: "Transportation",
          description: "Transportation expenses",
          organizationId: mockOrganizationId,
          categoryId: "clxcat00000000000001",
        }),
      });
    });

    it("should create type without description or category", async () => {
      const typeNoDescNoCategory = {
        ...mockReimbursementType,
        description: null,
        categoryId: null,
        category: null,
      };
      vi.mocked(prisma.reimbursementType.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.reimbursementType.create).mockResolvedValue(typeNoDescNoCategory as never);

      const res = await client.api.reimbursement.types.$post({
        json: {
          name: "Transportation",
          organizationId: mockOrganizationId,
        },
      });

      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.data.description).toBeNull();
      expect(json.data.categoryId).toBeNull();
      expect(json.data.category).toBeNull();
    });

    it("should return 409 for duplicate type name in organization", async () => {
      vi.mocked(prisma.reimbursementType.findUnique).mockResolvedValue(
        mockReimbursementType as never
      );

      const res = await client.api.reimbursement.types.$post({
        json: {
          name: "Transportation",
          organizationId: mockOrganizationId,
        },
      });

      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  describe("DELETE /api/reimbursement/types/:id", () => {
    it("should delete reimbursement type", async () => {
      vi.mocked(prisma.reimbursementType.findUnique).mockResolvedValue(
        mockReimbursementType as never
      );
      vi.mocked(prisma.reimbursementType.delete).mockResolvedValue(mockReimbursementType as never);

      const res = await client.api.reimbursement.types[":id"].$delete({
        param: { id: "clx1234567890abcdef2" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should return 404 for non-existent type", async () => {
      vi.mocked(prisma.reimbursementType.findUnique).mockResolvedValue(null);

      const res = await client.api.reimbursement.types[":id"].$delete({
        param: { id: "clx9999999999nonexist" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================================================
  // Reimbursement Roles
  // ==========================================================================

  describe("GET /api/reimbursement/roles", () => {
    it("should return paginated roles list", async () => {
      vi.mocked(prisma.reimbursementRole.findMany).mockResolvedValue([
        mockReimbursementRole,
      ] as never);
      vi.mocked(prisma.reimbursementRole.count).mockResolvedValue(1);

      const res = await client.api.reimbursement.roles.$get({
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
        id: "clxrole0000000000001",
        name: "Employee",
        organizationId: mockOrganizationId,
      });
    });

    it("should return empty list when no roles exist", async () => {
      vi.mocked(prisma.reimbursementRole.findMany).mockResolvedValue([]);
      vi.mocked(prisma.reimbursementRole.count).mockResolvedValue(0);

      const res = await client.api.reimbursement.roles.$get({
        query: { page: "1", pageSize: "20", organizationId: mockOrganizationId },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
      expect(json.meta.totalItems).toBe(0);
    });

    it("should use default pagination values", async () => {
      vi.mocked(prisma.reimbursementRole.findMany).mockResolvedValue([]);
      vi.mocked(prisma.reimbursementRole.count).mockResolvedValue(0);

      const res = await client.api.reimbursement.roles.$get({
        query: { organizationId: mockOrganizationId },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.meta.page).toBe(1);
      expect(json.meta.pageSize).toBe(20);
    });
  });

  describe("GET /api/reimbursement/roles/:id", () => {
    it("should return role by id", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue(
        mockReimbursementRole as never
      );

      const res = await client.api.reimbursement.roles[":id"].$get({
        param: { id: "clxrole0000000000001" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxrole0000000000001",
          name: "Employee",
          organizationId: mockOrganizationId,
        }),
      });
    });

    it("should return 404 for non-existent role", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue(null);

      const res = await client.api.reimbursement.roles[":id"].$get({
        param: { id: "clx9999999999nonexist" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  describe("POST /api/reimbursement/roles", () => {
    it("should create reimbursement role", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.reimbursementRole.create).mockResolvedValue(mockReimbursementRole as never);

      const res = await client.api.reimbursement.roles.$post({
        json: {
          name: "Employee",
          organizationId: mockOrganizationId,
        },
      });

      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxrole0000000000001",
          name: "Employee",
          organizationId: mockOrganizationId,
        }),
      });
    });

    it("should return 409 for duplicate role name in organization", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue(
        mockReimbursementRole as never
      );

      const res = await client.api.reimbursement.roles.$post({
        json: {
          name: "Employee",
          organizationId: mockOrganizationId,
        },
      });

      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  describe("DELETE /api/reimbursement/roles/:id", () => {
    it("should delete reimbursement role", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue(
        mockReimbursementRole as never
      );
      vi.mocked(prisma.reimbursementRole.delete).mockResolvedValue(mockReimbursementRole as never);

      const res = await client.api.reimbursement.roles[":id"].$delete({
        param: { id: "clxrole0000000000001" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should return 404 for non-existent role", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue(null);

      const res = await client.api.reimbursement.roles[":id"].$delete({
        param: { id: "clx9999999999nonexist" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================================================
  // Reimbursement Type Categories
  // ==========================================================================

  describe("GET /api/reimbursement/type-categories", () => {
    it("should return paginated type categories list", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findMany).mockResolvedValue([
        mockReimbursementTypeCategory,
      ] as never);
      vi.mocked(prisma.reimbursementTypeCategory.count).mockResolvedValue(1);

      const res = await client.api.reimbursement["type-categories"].$get({
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
        id: "clxcat00000000000001",
        name: "Scheduled",
        organizationId: mockOrganizationId,
      });
    });

    it("should return empty list when no type categories exist", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findMany).mockResolvedValue([]);
      vi.mocked(prisma.reimbursementTypeCategory.count).mockResolvedValue(0);

      const res = await client.api.reimbursement["type-categories"].$get({
        query: { page: "1", pageSize: "20", organizationId: mockOrganizationId },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
      expect(json.meta.totalItems).toBe(0);
    });

    it("should use default pagination values", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findMany).mockResolvedValue([]);
      vi.mocked(prisma.reimbursementTypeCategory.count).mockResolvedValue(0);

      const res = await client.api.reimbursement["type-categories"].$get({
        query: { organizationId: mockOrganizationId },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.meta.page).toBe(1);
      expect(json.meta.pageSize).toBe(20);
    });
  });

  describe("GET /api/reimbursement/type-categories/:id", () => {
    it("should return type category by id", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findUnique).mockResolvedValue(
        mockReimbursementTypeCategory as never
      );

      const res = await client.api.reimbursement["type-categories"][":id"].$get({
        param: { id: "clxcat00000000000001" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxcat00000000000001",
          name: "Scheduled",
          organizationId: mockOrganizationId,
        }),
      });
    });

    it("should return 404 for non-existent type category", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findUnique).mockResolvedValue(null);

      const res = await client.api.reimbursement["type-categories"][":id"].$get({
        param: { id: "clx9999999999nonexist" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  describe("POST /api/reimbursement/type-categories", () => {
    it("should create reimbursement type category", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.reimbursementTypeCategory.create).mockResolvedValue(
        mockReimbursementTypeCategory as never
      );

      const res = await client.api.reimbursement["type-categories"].$post({
        json: {
          name: "Scheduled",
          organizationId: mockOrganizationId,
        },
      });

      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxcat00000000000001",
          name: "Scheduled",
          organizationId: mockOrganizationId,
        }),
      });
    });

    it("should return 409 for duplicate type category name in organization", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findUnique).mockResolvedValue(
        mockReimbursementTypeCategory as never
      );

      const res = await client.api.reimbursement["type-categories"].$post({
        json: {
          name: "Scheduled",
          organizationId: mockOrganizationId,
        },
      });

      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  describe("DELETE /api/reimbursement/type-categories/:id", () => {
    it("should delete reimbursement type category", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findUnique).mockResolvedValue(
        mockReimbursementTypeCategory as never
      );
      vi.mocked(prisma.reimbursementTypeCategory.delete).mockResolvedValue(
        mockReimbursementTypeCategory as never
      );

      const res = await client.api.reimbursement["type-categories"][":id"].$delete({
        param: { id: "clxcat00000000000001" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should return 404 for non-existent type category", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findUnique).mockResolvedValue(null);

      const res = await client.api.reimbursement["type-categories"][":id"].$delete({
        param: { id: "clx9999999999nonexist" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================================================
  // Organization Membership Enforcement (403 scenarios)
  // ==========================================================================

  describe("Organization membership enforcement", () => {
    it("should return 403 when orgGuard rejects a list request", async () => {
      orgMiddlewareMock.mockImplementationOnce(async () => {
        throw new AppError(ErrorCode.FORBIDDEN, 403, "Not a member of this organization");
      });

      vi.mocked(prisma.reimbursementRole.findMany).mockResolvedValue([]);
      vi.mocked(prisma.reimbursementRole.count).mockResolvedValue(0);

      const res = await client.api.reimbursement.roles.$get({
        query: { page: "1", pageSize: "20", organizationId: mockOrganizationId },
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("should return 403 when orgGuard rejects a create request due to insufficient role", async () => {
      orgMiddlewareMock.mockImplementationOnce(async () => {
        throw new AppError(ErrorCode.FORBIDDEN, 403, "Insufficient organization role");
      });

      const res = await client.api.reimbursement.roles.$post({
        json: {
          name: "Employee",
          organizationId: mockOrganizationId,
        },
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("should return 403 when orgGuard rejects a delete request", async () => {
      orgMiddlewareMock.mockImplementationOnce(async () => {
        throw new AppError(ErrorCode.FORBIDDEN, 403, "Not a member of this organization");
      });

      const res = await client.api.reimbursement.roles[":id"].$delete({
        param: { id: "clxrole0000000000001" },
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });
});

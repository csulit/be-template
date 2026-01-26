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

vi.mock("../../../src/db.js", () => {
  const mockPrisma = {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    member: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    organization: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(async (fn: unknown) =>
      (fn as (tx: typeof mockPrisma) => Promise<unknown>)(mockPrisma)
    ),
  };
  return { prisma: mockPrisma };
});

import { createTestClient } from "../../helpers/test-client.js";
import { prisma } from "../../../src/db.js";

describe("Users Routes", () => {
  let client: ReturnType<typeof createTestClient>;

  const mockUser = {
    id: "clxuser00000000000001",
    name: "Test User",
    email: "test@example.com",
    emailVerified: true,
    image: null,
    role: "user",
    banned: false,
    banReason: null,
    banExpires: null,
    twoFactorEnabled: false,
    createdAt: new Date("2024-01-15T10:30:00.000Z"),
    updatedAt: new Date("2024-01-15T10:30:00.000Z"),
  };

  const mockAdminUser = {
    ...mockUser,
    id: "clxuser00000000000002",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
  };

  const mockOrg = {
    id: "clxorg0000000000001",
    name: "Acme Corp",
    slug: "acme-corp",
    logo: null,
    createdAt: new Date("2024-01-15T10:30:00.000Z"),
    metadata: null,
  };

  const mockMemberWithUser = {
    id: "clxmember000000000001",
    organizationId: "clxorg0000000000001",
    userId: "clxuser00000000000001",
    role: "member",
    createdAt: new Date("2024-01-15T10:30:00.000Z"),
    user: {
      id: "clxuser00000000000001",
      name: "Test User",
      email: "test@example.com",
      image: null,
    },
  };

  const mockOwnerMember = {
    id: "clxmember000000000002",
    organizationId: "clxorg0000000000001",
    userId: "clxuser00000000000002",
    role: "owner",
    createdAt: new Date("2024-01-15T10:30:00.000Z"),
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
          organizationId: "clxorg0000000000001",
          userId: "clxuser00000000000001",
          role: "admin",
          createdAt: new Date("2024-01-15T10:30:00.000Z"),
        });
        c.set("organizationId", "clxorg0000000000001");
        return next();
      }
    );
  });

  // ==========================================================================
  // GET /api/users/me - Get Current User Profile with Organizations
  // ==========================================================================

  describe("GET /api/users/me", () => {
    const mockUserWithOrgs = {
      ...mockUser,
      members: [
        {
          id: "clxmember000000000001",
          organizationId: "clxorg0000000000001",
          userId: "clxuser00000000000001",
          role: "member",
          createdAt: new Date("2024-01-15T10:30:00.000Z"),
          organization: {
            id: "clxorg0000000000001",
            name: "Acme Corp",
            slug: "acme-corp",
            logo: null,
          },
        },
      ],
    };

    const mockUserWithEmptyOrgs = {
      ...mockUser,
      members: [],
    };

    it("should return user profile with organizations", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithOrgs as never);

      const res = await client.api.users.me.$get({});

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxuser00000000000001",
          name: "Test User",
          email: "test@example.com",
          organizations: expect.any(Array),
        }),
      });
      expect(json.data.organizations).toHaveLength(1);
      expect(json.data.organizations[0]).toMatchObject({
        id: "clxmember000000000001",
        role: "member",
        organization: {
          id: "clxorg0000000000001",
          name: "Acme Corp",
          slug: "acme-corp",
          logo: null,
        },
      });
    });

    it("should return empty organizations array when user has no memberships", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithEmptyOrgs as never);

      const res = await client.api.users.me.$get({});

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxuser00000000000001",
          organizations: [],
        }),
      });
      expect(json.data.organizations).toHaveLength(0);
    });

    it("should return 404 when user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await client.api.users.me.$get({});

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================================================
  // GET /api/users/ - List Users (Admin)
  // ==========================================================================

  describe("GET /api/users/", () => {
    it("should return paginated users list", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser, mockAdminUser] as never);
      vi.mocked(prisma.user.count).mockResolvedValue(2);

      const res = await client.api.users.$get({
        query: { page: "1", pageSize: "20" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.any(Array),
        meta: expect.objectContaining({
          page: 1,
          pageSize: 20,
          totalItems: 2,
          totalPages: 1,
        }),
      });
      expect(json.data).toHaveLength(2);
    });

    it("should return empty list when no users exist", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      const res = await client.api.users.$get({
        query: { page: "1", pageSize: "20" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
      expect(json.meta.totalItems).toBe(0);
    });

    it("should handle search query parameter", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser] as never);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const res = await client.api.users.$get({
        query: { page: "1", pageSize: "20", search: "test" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: "test", mode: "insensitive" } },
              { email: { contains: "test", mode: "insensitive" } },
            ],
          }),
        })
      );
    });

    it("should handle role filter", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockAdminUser] as never);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const res = await client.api.users.$get({
        query: { page: "1", pageSize: "20", role: "admin" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: "admin" }),
        })
      );
    });

    it("should use default pagination values", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      const res = await client.api.users.$get({
        query: {},
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.meta.page).toBe(1);
      expect(json.meta.pageSize).toBe(20);
    });
  });

  // ==========================================================================
  // GET /api/users/:id - Get User by ID (Admin)
  // ==========================================================================

  describe("GET /api/users/:id", () => {
    it("should return user by ID", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);

      const res = await client.api.users[":id"].$get({
        param: { id: "clxuser00000000000001" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxuser00000000000001",
          name: "Test User",
          email: "test@example.com",
        }),
      });
    });

    it("should return 404 for non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await client.api.users[":id"].$get({
        param: { id: "clx9999999999nonexist" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================================================
  // PATCH /api/users/:id - Admin Update User
  // ==========================================================================

  describe("PATCH /api/users/:id", () => {
    it("should update user", async () => {
      const updatedUser = { ...mockUser, name: "Updated Name" };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as never);

      const res = await client.api.users[":id"].$patch({
        param: { id: "clxuser00000000000001" },
        json: { name: "Updated Name" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxuser00000000000001",
          name: "Updated Name",
        }),
      });
    });

    it("should return 404 for non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await client.api.users[":id"].$patch({
        param: { id: "clx9999999999nonexist" },
        json: { name: "Updated Name" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("should handle empty update body", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as never);

      const res = await client.api.users[":id"].$patch({
        param: { id: "clxuser00000000000001" },
        json: {},
      });

      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // POST /api/users/:id/ban - Ban User
  // ==========================================================================

  describe("POST /api/users/:id/ban", () => {
    it("should ban user", async () => {
      const bannedUser = {
        ...mockUser,
        banned: true,
        banReason: null,
        banExpires: null,
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.user.update).mockResolvedValue(bannedUser as never);

      const res = await client.api.users[":id"].ban.$post({
        param: { id: "clxuser00000000000001" },
        json: {},
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxuser00000000000001",
          banned: true,
        }),
      });
    });

    it("should ban user with reason and expiry", async () => {
      const banExpires = new Date("2025-12-31T23:59:59Z");
      const bannedUser = {
        ...mockUser,
        banned: true,
        banReason: "Violated terms of service",
        banExpires,
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.user.update).mockResolvedValue(bannedUser as never);

      const res = await client.api.users[":id"].ban.$post({
        param: { id: "clxuser00000000000001" },
        json: {
          banReason: "Violated terms of service",
          banExpires: "2025-12-31T23:59:59Z",
        },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxuser00000000000001",
          banned: true,
          banReason: "Violated terms of service",
        }),
      });
    });

    it("should return 404 for non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await client.api.users[":id"].ban.$post({
        param: { id: "clx9999999999nonexist" },
        json: {},
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================================================
  // POST /api/users/:id/unban - Unban User
  // ==========================================================================

  describe("POST /api/users/:id/unban", () => {
    it("should unban user", async () => {
      const bannedUser = {
        ...mockUser,
        banned: true,
        banReason: "Violated terms",
        banExpires: new Date("2025-12-31T23:59:59Z"),
      };
      const unbannedUser = {
        ...mockUser,
        banned: false,
        banReason: null,
        banExpires: null,
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(bannedUser as never);
      vi.mocked(prisma.user.update).mockResolvedValue(unbannedUser as never);

      const res = await client.api.users[":id"].unban.$post({
        param: { id: "clxuser00000000000001" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxuser00000000000001",
          banned: false,
          banReason: null,
        }),
      });
    });

    it("should return 404 for non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await client.api.users[":id"].unban.$post({
        param: { id: "clx9999999999nonexist" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================================================
  // GET /api/users/org-members - List Organization Members
  // ==========================================================================

  describe("GET /api/users/org-members", () => {
    it("should return paginated org members list", async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([mockMemberWithUser] as never);
      vi.mocked(prisma.member.count).mockResolvedValue(1);

      const res = await client.api.users["org-members"].$get({
        query: { page: "1", pageSize: "20", organizationId: "clxorg0000000000001" },
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
        id: "clxmember000000000001",
        role: "member",
        user: {
          id: "clxuser00000000000001",
          name: "Test User",
          email: "test@example.com",
        },
      });
    });

    it("should return empty list when no members exist", async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([]);
      vi.mocked(prisma.member.count).mockResolvedValue(0);

      const res = await client.api.users["org-members"].$get({
        query: { page: "1", pageSize: "20", organizationId: "clxorg0000000000001" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
      expect(json.meta.totalItems).toBe(0);
    });

    it("should filter by member role", async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.member.count).mockResolvedValue(0);

      const res = await client.api.users["org-members"].$get({
        query: {
          page: "1",
          pageSize: "20",
          organizationId: "clxorg0000000000001",
          role: "admin",
        },
      });

      expect(res.status).toBe(200);
      expect(prisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "clxorg0000000000001",
            role: "admin",
          }),
        })
      );
    });
  });

  // ==========================================================================
  // GET /api/users/orgs - List Organizations
  // ==========================================================================

  describe("GET /api/users/orgs", () => {
    it("should return paginated orgs list", async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValue([mockOrg] as never);
      vi.mocked(prisma.organization.count).mockResolvedValue(1);

      const res = await client.api.users.orgs.$get({
        query: { page: "1", pageSize: "20" },
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
    });

    it("should return empty list when no orgs exist", async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValue([]);
      vi.mocked(prisma.organization.count).mockResolvedValue(0);

      const res = await client.api.users.orgs.$get({
        query: { page: "1", pageSize: "20" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
      expect(json.meta.totalItems).toBe(0);
    });

    it("should handle search query parameter", async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValue([mockOrg] as never);
      vi.mocked(prisma.organization.count).mockResolvedValue(1);

      const res = await client.api.users.orgs.$get({
        query: { page: "1", pageSize: "20", search: "acme" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(prisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: "acme", mode: "insensitive" } },
              { slug: { contains: "acme", mode: "insensitive" } },
            ],
          }),
        })
      );
    });
  });

  // ==========================================================================
  // GET /api/users/orgs/:orgId - Get Organization by ID
  // ==========================================================================

  describe("GET /api/users/orgs/:orgId", () => {
    it("should return org by ID", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as never);

      const res = await client.api.users.orgs[":orgId"].$get({
        param: { orgId: "clxorg0000000000001" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxorg0000000000001",
          name: "Acme Corp",
          slug: "acme-corp",
        }),
      });
    });

    it("should return 404 for non-existent org", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      const res = await client.api.users.orgs[":orgId"].$get({
        param: { orgId: "clxorg9999999nonexist" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================================================
  // POST /api/users/orgs - Create Organization
  // ==========================================================================

  describe("POST /api/users/orgs", () => {
    it("should create organization", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.organization.create).mockResolvedValue(mockOrg as never);

      const res = await client.api.users.orgs.$post({
        json: { name: "Acme Corp", slug: "acme-corp" },
      });

      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxorg0000000000001",
          name: "Acme Corp",
          slug: "acme-corp",
        }),
      });
    });

    it("should return 409 for duplicate slug", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as never);

      const res = await client.api.users.orgs.$post({
        json: { name: "Another Corp", slug: "acme-corp" },
      });

      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================================================
  // PATCH /api/users/orgs/:orgId - Update Organization
  // ==========================================================================

  describe("PATCH /api/users/orgs/:orgId", () => {
    it("should update organization", async () => {
      const updatedOrg = { ...mockOrg, name: "Updated Acme Corp" };
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as never);
      vi.mocked(prisma.organization.update).mockResolvedValue(updatedOrg as never);

      const res = await client.api.users.orgs[":orgId"].$patch({
        param: { orgId: "clxorg0000000000001" },
        json: { name: "Updated Acme Corp" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxorg0000000000001",
          name: "Updated Acme Corp",
        }),
      });
    });

    it("should return 404 for non-existent org", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      const res = await client.api.users.orgs[":orgId"].$patch({
        param: { orgId: "clxorg9999999nonexist" },
        json: { name: "Updated Name" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================================================
  // DELETE /api/users/orgs/:orgId - Delete Organization
  // ==========================================================================

  describe("DELETE /api/users/orgs/:orgId", () => {
    it("should delete organization", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as never);
      vi.mocked(prisma.organization.delete).mockResolvedValue(mockOrg as never);

      const res = await client.api.users.orgs[":orgId"].$delete({
        param: { orgId: "clxorg0000000000001" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should return 404 for non-existent org", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      const res = await client.api.users.orgs[":orgId"].$delete({
        param: { orgId: "clxorg9999999nonexist" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================================================
  // PATCH /api/users/orgs/:orgId/members/:memberId/role - Set Member Role
  // ==========================================================================

  describe("PATCH /api/users/orgs/:orgId/members/:memberId/role", () => {
    it("should update member role", async () => {
      const updatedMember = { ...mockMemberWithUser, role: "admin" };
      vi.mocked(prisma.member.findFirst).mockResolvedValue(mockMemberWithUser as never);
      vi.mocked(prisma.member.update).mockResolvedValue(updatedMember as never);

      const res = await client.api.users.orgs[":orgId"].members[":memberId"].role.$patch({
        param: { orgId: "clxorg0000000000001", memberId: "clxmember000000000001" },
        json: { role: "admin" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxmember000000000001",
          role: "admin",
        }),
      });
    });

    it("should return 404 for non-existent member", async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

      const res = await client.api.users.orgs[":orgId"].members[":memberId"].role.$patch({
        param: { orgId: "clxorg0000000000001", memberId: "clxmember999nonexist" },
        json: { role: "admin" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================================================
  // DELETE /api/users/orgs/:orgId/members/:memberId - Remove Member
  // ==========================================================================

  describe("DELETE /api/users/orgs/:orgId/members/:memberId", () => {
    it("should remove member from org", async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(mockMemberWithUser as never);
      vi.mocked(prisma.member.delete).mockResolvedValue(mockMemberWithUser as never);

      const res = await client.api.users.orgs[":orgId"].members[":memberId"].$delete({
        param: { orgId: "clxorg0000000000001", memberId: "clxmember000000000001" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should return 404 for non-existent member", async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

      const res = await client.api.users.orgs[":orgId"].members[":memberId"].$delete({
        param: { orgId: "clxorg0000000000001", memberId: "clxmember999nonexist" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================================================
  // POST /api/users/orgs/:orgId/transfer-ownership - Transfer Ownership
  // ==========================================================================

  describe("POST /api/users/orgs/:orgId/transfer-ownership", () => {
    it("should transfer ownership", async () => {
      // First call: getOrgById checks org exists
      // Second call: slug uniqueness check in updateOrg (not relevant here)
      // The service calls findUnique multiple times
      vi.mocked(prisma.organization.findUnique)
        .mockResolvedValueOnce(mockOrg as never) // org exists check
        .mockResolvedValueOnce(mockOrg as never); // final findUnique after transaction

      // findFirst calls: 1) newOwnerMember lookup, 2) currentOwner lookup
      vi.mocked(prisma.member.findFirst)
        .mockResolvedValueOnce(mockMemberWithUser as never) // new owner is a member
        .mockResolvedValueOnce(mockOwnerMember as never); // current owner lookup

      vi.mocked(prisma.member.update).mockResolvedValue(mockMemberWithUser as never);

      const res = await client.api.users.orgs[":orgId"]["transfer-ownership"].$post({
        param: { orgId: "clxorg0000000000001" },
        json: { newOwnerId: "clxuser00000000000001" },
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: "clxorg0000000000001",
          name: "Acme Corp",
        }),
      });
    });

    it("should return 404 for non-existent org", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      const res = await client.api.users.orgs[":orgId"]["transfer-ownership"].$post({
        param: { orgId: "clxorg9999999nonexist" },
        json: { newOwnerId: "clxuser00000000000001" },
      });

      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });
});

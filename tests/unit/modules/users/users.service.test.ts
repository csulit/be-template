import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../src/db.js", () => {
  const prismaMock = {
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
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(prismaMock)),
  };
  return { prisma: prismaMock };
});

import { prisma } from "../../../../src/db.js";
import { UsersService } from "../../../../src/modules/users/users.service.js";

describe("UsersService", () => {
  const service = new UsersService();

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

  const mockMember = {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // listUsers
  // ==========================================================================

  describe("listUsers", () => {
    it("should return paginated list of users", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser, mockAdminUser] as never);
      vi.mocked(prisma.user.count).mockResolvedValue(2);

      const result = await service.listUsers({ page: 1, pageSize: 20 });

      expect(result).toMatchObject({
        success: true,
        data: expect.any(Array),
        meta: expect.objectContaining({
          page: 1,
          pageSize: 20,
          totalItems: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        }),
      });
      expect(result.data).toHaveLength(2);
    });

    it("should search by name (case insensitive)", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser] as never);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      await service.listUsers({ page: 1, pageSize: 20, search: "test" });

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

    it("should search by email (case insensitive)", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser] as never);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      await service.listUsers({ page: 1, pageSize: 20, search: "test@example" });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: "test@example", mode: "insensitive" } },
              { email: { contains: "test@example", mode: "insensitive" } },
            ],
          }),
        })
      );
    });

    it("should filter by role", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockAdminUser] as never);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      await service.listUsers({ page: 1, pageSize: 20, role: "admin" });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: "admin" }),
        })
      );
      expect(prisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: "admin" }),
        })
      );
    });

    it("should combine search and role filter", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockAdminUser] as never);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      await service.listUsers({ page: 1, pageSize: 20, search: "admin", role: "admin" });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: "admin", mode: "insensitive" } },
              { email: { contains: "admin", mode: "insensitive" } },
            ],
            role: "admin",
          }),
        })
      );
    });

    it("should return empty list when no users match", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      const result = await service.listUsers({ page: 1, pageSize: 20, search: "nonexistent" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
    });

    it("should handle default pagination", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser] as never);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const result = await service.listUsers({ page: 1, pageSize: 20 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { createdAt: "desc" },
        })
      );
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(20);
    });
  });

  // ==========================================================================
  // adminUpdateUser
  // ==========================================================================

  describe("adminUpdateUser", () => {
    it("should update user name", async () => {
      const updatedUser = { ...mockUser, name: "Updated Name" };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as never);

      const result = await service.adminUpdateUser("clxuser00000000000001", {
        name: "Updated Name",
      });

      expect(result.name).toBe("Updated Name");
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clxuser00000000000001" },
          data: expect.objectContaining({ name: "Updated Name" }),
        })
      );
    });

    it("should update user role", async () => {
      const updatedUser = { ...mockUser, role: "admin" };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as never);

      const result = await service.adminUpdateUser("clxuser00000000000001", { role: "admin" });

      expect(result.role).toBe("admin");
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clxuser00000000000001" },
          data: expect.objectContaining({ role: "admin" }),
        })
      );
    });

    it("should update user banned status", async () => {
      const updatedUser = { ...mockUser, banned: true };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as never);

      const result = await service.adminUpdateUser("clxuser00000000000001", { banned: true });

      expect(result.banned).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clxuser00000000000001" },
          data: expect.objectContaining({ banned: true }),
        })
      );
    });

    it("should throw NotFound for non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(service.adminUpdateUser("nonexistent", { name: "Test" })).rejects.toThrow(
        "User not found"
      );
    });

    it("should handle empty update data", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as never);

      const result = await service.adminUpdateUser("clxuser00000000000001", {});

      expect(result).toMatchObject({ id: "clxuser00000000000001" });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clxuser00000000000001" },
          data: {},
        })
      );
    });
  });

  // ==========================================================================
  // banUser
  // ==========================================================================

  describe("banUser", () => {
    it("should ban a user with reason and expiry", async () => {
      const banExpires = "2025-12-31T23:59:59Z";
      const bannedUser = {
        ...mockUser,
        banned: true,
        banReason: "Violated terms",
        banExpires: new Date(banExpires),
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.user.update).mockResolvedValue(bannedUser as never);

      const result = await service.banUser("clxuser00000000000001", {
        banReason: "Violated terms",
        banExpires,
      });

      expect(result.banned).toBe(true);
      expect(result.banReason).toBe("Violated terms");
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clxuser00000000000001" },
          data: {
            banned: true,
            banReason: "Violated terms",
            banExpires: new Date(banExpires),
          },
        })
      );
    });

    it("should ban a user without reason (defaults)", async () => {
      const bannedUser = {
        ...mockUser,
        banned: true,
        banReason: null,
        banExpires: null,
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.user.update).mockResolvedValue(bannedUser as never);

      const result = await service.banUser("clxuser00000000000001", {});

      expect(result.banned).toBe(true);
      expect(result.banReason).toBeNull();
      expect(result.banExpires).toBeNull();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clxuser00000000000001" },
          data: {
            banned: true,
            banReason: null,
            banExpires: null,
          },
        })
      );
    });

    it("should throw NotFound for non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(service.banUser("nonexistent", { banReason: "test" })).rejects.toThrow(
        "User not found"
      );
    });
  });

  // ==========================================================================
  // unbanUser
  // ==========================================================================

  describe("unbanUser", () => {
    it("should unban a user (sets banned=false, clears reason and expiry)", async () => {
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

      const result = await service.unbanUser("clxuser00000000000001");

      expect(result.banned).toBe(false);
      expect(result.banReason).toBeNull();
      expect(result.banExpires).toBeNull();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clxuser00000000000001" },
          data: {
            banned: false,
            banReason: null,
            banExpires: null,
          },
        })
      );
    });

    it("should throw NotFound for non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(service.unbanUser("nonexistent")).rejects.toThrow("User not found");
    });
  });

  // ==========================================================================
  // listOrgMembers
  // ==========================================================================

  describe("listOrgMembers", () => {
    it("should return paginated org members with user details", async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([mockMember] as never);
      vi.mocked(prisma.member.count).mockResolvedValue(1);

      const result = await service.listOrgMembers({
        page: 1,
        pageSize: 20,
        organizationId: "clxorg0000000000001",
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.any(Array),
        meta: expect.objectContaining({
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        }),
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: "clxmember000000000001",
        role: "member",
        user: {
          id: "clxuser00000000000001",
          name: "Test User",
          email: "test@example.com",
          image: null,
        },
      });
    });

    it("should filter by org member role", async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.member.count).mockResolvedValue(0);

      await service.listOrgMembers({
        page: 1,
        pageSize: 20,
        organizationId: "clxorg0000000000001",
        role: "admin",
      });

      expect(prisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "clxorg0000000000001",
            role: "admin",
          }),
        })
      );
      expect(prisma.member.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "clxorg0000000000001",
            role: "admin",
          }),
        })
      );
    });

    it("should return empty list when no members exist", async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([]);
      vi.mocked(prisma.member.count).mockResolvedValue(0);

      const result = await service.listOrgMembers({
        page: 1,
        pageSize: 20,
        organizationId: "clxorg0000000000001",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
    });

    it("should handle default pagination", async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([mockMember] as never);
      vi.mocked(prisma.member.count).mockResolvedValue(1);

      const result = await service.listOrgMembers({
        page: 1,
        pageSize: 20,
        organizationId: "clxorg0000000000001",
      });

      expect(prisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { createdAt: "desc" },
        })
      );
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(20);
    });
  });

  // ==========================================================================
  // listOrgs
  // ==========================================================================

  describe("listOrgs", () => {
    it("should return paginated list of organizations", async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValue([mockOrg] as never);
      vi.mocked(prisma.organization.count).mockResolvedValue(1);

      const result = await service.listOrgs({ page: 1, pageSize: 20 });

      expect(result).toMatchObject({
        success: true,
        data: expect.any(Array),
        meta: expect.objectContaining({
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        }),
      });
      expect(result.data).toHaveLength(1);
    });

    it("should search by name (case insensitive)", async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValue([mockOrg] as never);
      vi.mocked(prisma.organization.count).mockResolvedValue(1);

      await service.listOrgs({ page: 1, pageSize: 20, search: "acme" });

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

    it("should search by slug (case insensitive)", async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValue([mockOrg] as never);
      vi.mocked(prisma.organization.count).mockResolvedValue(1);

      await service.listOrgs({ page: 1, pageSize: 20, search: "acme-corp" });

      expect(prisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: "acme-corp", mode: "insensitive" } },
              { slug: { contains: "acme-corp", mode: "insensitive" } },
            ],
          }),
        })
      );
    });

    it("should return empty list when no orgs match", async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValue([]);
      vi.mocked(prisma.organization.count).mockResolvedValue(0);

      const result = await service.listOrgs({ page: 1, pageSize: 20, search: "nonexistent" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
    });
  });

  // ==========================================================================
  // getOrgById
  // ==========================================================================

  describe("getOrgById", () => {
    it("should return organization by ID", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as never);

      const result = await service.getOrgById("clxorg0000000000001");

      expect(result).toEqual(mockOrg);
      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: "clxorg0000000000001" },
      });
    });

    it("should throw NotFound for non-existent organization", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      await expect(service.getOrgById("nonexistent")).rejects.toThrow("Organization not found");
    });
  });

  // ==========================================================================
  // createOrg
  // ==========================================================================

  describe("createOrg", () => {
    it("should create a new organization", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.organization.create).mockResolvedValue(mockOrg as never);

      const result = await service.createOrg({
        name: "Acme Corp",
        slug: "acme-corp",
      });

      expect(result).toEqual(mockOrg);
      expect(prisma.organization.create).toHaveBeenCalledWith({
        data: {
          name: "Acme Corp",
          slug: "acme-corp",
          logo: null,
          metadata: null,
        },
      });
    });

    it("should throw Conflict when slug already exists", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as never);

      await expect(service.createOrg({ name: "Another Corp", slug: "acme-corp" })).rejects.toThrow(
        "Organization with this slug already exists"
      );
    });
  });

  // ==========================================================================
  // updateOrg
  // ==========================================================================

  describe("updateOrg", () => {
    it("should update organization name", async () => {
      const updatedOrg = { ...mockOrg, name: "Updated Corp" };
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as never);
      vi.mocked(prisma.organization.update).mockResolvedValue(updatedOrg as never);

      const result = await service.updateOrg("clxorg0000000000001", {
        name: "Updated Corp",
      });

      expect(result.name).toBe("Updated Corp");
      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clxorg0000000000001" },
          data: expect.objectContaining({ name: "Updated Corp" }),
        })
      );
    });

    it("should throw NotFound for non-existent organization", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      await expect(service.updateOrg("nonexistent", { name: "Updated Corp" })).rejects.toThrow(
        "Organization not found"
      );
    });

    it("should throw Conflict when updating to existing slug", async () => {
      const anotherOrg = { ...mockOrg, id: "clxorg0000000000002", slug: "other-corp" };
      vi.mocked(prisma.organization.findUnique)
        .mockResolvedValueOnce(mockOrg as never) // First call: find org by ID
        .mockResolvedValueOnce(anotherOrg as never); // Second call: slug uniqueness check

      await expect(
        service.updateOrg("clxorg0000000000001", { slug: "other-corp" })
      ).rejects.toThrow("Organization with this slug already exists");
    });
  });

  // ==========================================================================
  // deleteOrg
  // ==========================================================================

  describe("deleteOrg", () => {
    it("should delete organization", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as never);
      vi.mocked(prisma.organization.delete).mockResolvedValue(mockOrg as never);

      await service.deleteOrg("clxorg0000000000001");

      expect(prisma.organization.delete).toHaveBeenCalledWith({
        where: { id: "clxorg0000000000001" },
      });
    });

    it("should throw NotFound for non-existent organization", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      await expect(service.deleteOrg("nonexistent")).rejects.toThrow("Organization not found");
    });
  });

  // ==========================================================================
  // setOrgMemberRole
  // ==========================================================================

  describe("setOrgMemberRole", () => {
    it("should update member role", async () => {
      const updatedMember = { ...mockMemberWithUser, role: "admin" };
      vi.mocked(prisma.member.findFirst).mockResolvedValue(mockMemberWithUser as never);
      vi.mocked(prisma.member.update).mockResolvedValue(updatedMember as never);

      const result = await service.setOrgMemberRole(
        "clxorg0000000000001",
        "clxmember000000000001",
        { role: "admin" }
      );

      expect(result.role).toBe("admin");
      expect(prisma.member.findFirst).toHaveBeenCalledWith({
        where: { id: "clxmember000000000001", organizationId: "clxorg0000000000001" },
      });
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: "clxmember000000000001" },
        data: { role: "admin" },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });
    });

    it("should throw NotFound when member not found in organization", async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

      await expect(
        service.setOrgMemberRole("clxorg0000000000001", "nonexistent", { role: "admin" })
      ).rejects.toThrow("Member not found in this organization");
    });
  });

  // ==========================================================================
  // removeOrgMember
  // ==========================================================================

  describe("removeOrgMember", () => {
    it("should remove member from organization", async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(mockMemberWithUser as never);
      vi.mocked(prisma.member.delete).mockResolvedValue(mockMemberWithUser as never);

      await service.removeOrgMember("clxorg0000000000001", "clxmember000000000001");

      expect(prisma.member.findFirst).toHaveBeenCalledWith({
        where: { id: "clxmember000000000001", organizationId: "clxorg0000000000001" },
      });
      expect(prisma.member.delete).toHaveBeenCalledWith({
        where: { id: "clxmember000000000001" },
      });
    });

    it("should throw NotFound when member not found in organization", async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

      await expect(service.removeOrgMember("clxorg0000000000001", "nonexistent")).rejects.toThrow(
        "Member not found in this organization"
      );
    });
  });

  // ==========================================================================
  // transferOrgOwnership
  // ==========================================================================

  describe("transferOrgOwnership", () => {
    it("should transfer ownership (demote current owner, promote new owner)", async () => {
      const newOwnerMember = {
        id: "clxmember000000000001",
        organizationId: "clxorg0000000000001",
        userId: "clxuser00000000000001",
        role: "member",
        createdAt: new Date("2024-01-15T10:30:00.000Z"),
      };

      vi.mocked(prisma.organization.findUnique)
        .mockResolvedValueOnce(mockOrg as never) // First call: find org
        .mockResolvedValueOnce(mockOrg as never); // Last call: return updated org
      vi.mocked(prisma.member.findFirst)
        .mockResolvedValueOnce(newOwnerMember as never) // Second call: find new owner member
        .mockResolvedValueOnce(mockOwnerMember as never); // Third call: find current owner
      vi.mocked(prisma.member.update).mockResolvedValue({} as never);

      const result = await service.transferOrgOwnership("clxorg0000000000001", {
        newOwnerId: "clxuser00000000000001",
      });

      expect(result).toEqual(mockOrg);

      // Verify the transaction updated both members
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: mockOwnerMember.id },
        data: { role: "admin" },
      });
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: newOwnerMember.id },
        data: { role: "owner" },
      });
    });

    it("should throw NotFound for non-existent organization", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      await expect(
        service.transferOrgOwnership("nonexistent", { newOwnerId: "clxuser00000000000001" })
      ).rejects.toThrow("Organization not found");
    });

    it("should throw NotFound when new owner is not a member", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as never);
      vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

      await expect(
        service.transferOrgOwnership("clxorg0000000000001", { newOwnerId: "nonexistent" })
      ).rejects.toThrow("User is not a member of this organization");
    });
  });
});

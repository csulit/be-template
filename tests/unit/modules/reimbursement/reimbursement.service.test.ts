import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../src/db.js", () => ({
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

import { prisma } from "../../../../src/db.js";
import { ReimbursementService } from "../../../../src/modules/reimbursement/reimbursement.service.js";

describe("ReimbursementService", () => {
  const service = new ReimbursementService();

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
    id: "test_user_1",
    name: "Test User",
    email: "test@example.com",
  };

  const mockReimbursementUser = {
    id: "clx1234567890abcdef1",
    userId: "test_user_1",
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Reimbursement Users
  // ==========================================================================

  describe("listUsers", () => {
    it("should return paginated users list", async () => {
      vi.mocked(prisma.reimbursementUser.findMany).mockResolvedValue([
        mockReimbursementUser,
      ] as never);
      vi.mocked(prisma.reimbursementUser.count).mockResolvedValue(1);

      const result = await service.listUsers({
        page: 1,
        pageSize: 20,
        organizationId: mockOrganizationId,
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
        id: "clx1234567890abcdef1",
        userId: "test_user_1",
        roleId: "clxrole0000000000001",
        organizationId: mockOrganizationId,
        role: {
          id: "clxrole0000000000001",
          name: "Employee",
          organizationId: mockOrganizationId,
        },
        user: {
          id: "test_user_1",
          name: "Test User",
          email: "test@example.com",
        },
      });
    });

    it("should filter by organizationId", async () => {
      vi.mocked(prisma.reimbursementUser.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.reimbursementUser.count).mockResolvedValue(0);

      await service.listUsers({ page: 1, pageSize: 20, organizationId: mockOrganizationId });

      expect(prisma.reimbursementUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: mockOrganizationId }),
        })
      );
      expect(prisma.reimbursementUser.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: mockOrganizationId }),
        })
      );
    });

    it("should filter by roleId when provided", async () => {
      vi.mocked(prisma.reimbursementUser.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.reimbursementUser.count).mockResolvedValue(0);

      await service.listUsers({
        page: 1,
        pageSize: 20,
        organizationId: mockOrganizationId,
        roleId: "clxrole0000000000001",
      });

      expect(prisma.reimbursementUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ roleId: "clxrole0000000000001" }),
        })
      );
      expect(prisma.reimbursementUser.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ roleId: "clxrole0000000000001" }),
        })
      );
    });

    it("should return empty list when no users exist", async () => {
      vi.mocked(prisma.reimbursementUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.reimbursementUser.count).mockResolvedValue(0);

      const result = await service.listUsers({
        page: 1,
        pageSize: 20,
        organizationId: mockOrganizationId,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
    });
  });

  describe("getUserById", () => {
    it("should return user when found", async () => {
      vi.mocked(prisma.reimbursementUser.findUnique).mockResolvedValue(
        mockReimbursementUser as never
      );

      const result = await service.getUserById("clx1234567890abcdef1");

      expect(result).toMatchObject({
        id: "clx1234567890abcdef1",
        userId: "test_user_1",
        roleId: "clxrole0000000000001",
        organizationId: mockOrganizationId,
        role: {
          id: "clxrole0000000000001",
          name: "Employee",
        },
        user: {
          id: "test_user_1",
          name: "Test User",
          email: "test@example.com",
        },
      });
      expect(prisma.reimbursementUser.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clx1234567890abcdef1" },
        })
      );
    });

    it("should throw NotFound when user does not exist", async () => {
      vi.mocked(prisma.reimbursementUser.findUnique).mockResolvedValue(null);

      await expect(service.getUserById("nonexistent")).rejects.toThrow(
        "Reimbursement user not found"
      );
    });
  });

  describe("createUser", () => {
    it("should create and return user role assignment", async () => {
      vi.mocked(prisma.reimbursementUser.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.reimbursementUser.create).mockResolvedValue(mockReimbursementUser as never);

      const result = await service.createUser({
        userId: "test_user_1",
        roleId: "clxrole0000000000001",
        organizationId: mockOrganizationId,
      });

      expect(result).toMatchObject({
        id: "clx1234567890abcdef1",
        userId: "test_user_1",
        roleId: "clxrole0000000000001",
        organizationId: mockOrganizationId,
      });
      expect(prisma.reimbursementUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userId: "test_user_1",
            roleId: "clxrole0000000000001",
            organizationId: mockOrganizationId,
          },
        })
      );
    });

    it("should throw Conflict when user already has the role assigned", async () => {
      vi.mocked(prisma.reimbursementUser.findUnique).mockResolvedValue(
        mockReimbursementUser as never
      );

      await expect(
        service.createUser({
          userId: "test_user_1",
          roleId: "clxrole0000000000001",
          organizationId: mockOrganizationId,
        })
      ).rejects.toThrow("User already has this reimbursement role assigned");
    });
  });

  describe("updateUser", () => {
    it("should update user role and return updated record", async () => {
      const newRoleId = "clxrole0000000000002";
      const updatedUser = { ...mockReimbursementUser, roleId: newRoleId };
      vi.mocked(prisma.reimbursementUser.findUnique)
        .mockResolvedValueOnce(mockReimbursementUser as never)
        .mockResolvedValueOnce(null as never);
      vi.mocked(prisma.reimbursementUser.update).mockResolvedValue(updatedUser as never);

      const result = await service.updateUser("clx1234567890abcdef1", { roleId: newRoleId });

      expect(result).toMatchObject({
        id: "clx1234567890abcdef1",
        roleId: newRoleId,
      });
      expect(prisma.reimbursementUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clx1234567890abcdef1" },
          data: expect.objectContaining({ roleId: newRoleId }),
        })
      );
    });

    it("should throw NotFound when user does not exist", async () => {
      vi.mocked(prisma.reimbursementUser.findUnique).mockResolvedValue(null);

      await expect(
        service.updateUser("nonexistent", { roleId: "clxrole0000000000002" })
      ).rejects.toThrow("Reimbursement user not found");
    });

    it("should throw Conflict when target role is already assigned to the same user", async () => {
      const newRoleId = "clxrole0000000000002";
      const existingConflict = {
        ...mockReimbursementUser,
        id: "clx_other",
        roleId: newRoleId,
      };
      vi.mocked(prisma.reimbursementUser.findUnique)
        .mockResolvedValueOnce(mockReimbursementUser as never)
        .mockResolvedValueOnce(existingConflict as never);

      await expect(
        service.updateUser("clx1234567890abcdef1", { roleId: newRoleId })
      ).rejects.toThrow("User already has this reimbursement role assigned");
    });
  });

  describe("deleteUser", () => {
    it("should delete user when found", async () => {
      vi.mocked(prisma.reimbursementUser.findUnique).mockResolvedValue(
        mockReimbursementUser as never
      );
      vi.mocked(prisma.reimbursementUser.delete).mockResolvedValue(mockReimbursementUser as never);

      await service.deleteUser("clx1234567890abcdef1");

      expect(prisma.reimbursementUser.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clx1234567890abcdef1" },
        })
      );
    });

    it("should throw NotFound when user does not exist", async () => {
      vi.mocked(prisma.reimbursementUser.findUnique).mockResolvedValue(null);

      await expect(service.deleteUser("nonexistent")).rejects.toThrow(
        "Reimbursement user not found"
      );
    });
  });

  // ==========================================================================
  // Reimbursement Types
  // ==========================================================================

  describe("listTypes", () => {
    it("should return paginated types list", async () => {
      vi.mocked(prisma.reimbursementType.findMany).mockResolvedValue([
        mockReimbursementType,
      ] as never);
      vi.mocked(prisma.reimbursementType.count).mockResolvedValue(1);

      const result = await service.listTypes({
        page: 1,
        pageSize: 20,
        organizationId: mockOrganizationId,
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.any(Array),
        meta: expect.objectContaining({
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        }),
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
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

    it("should filter by organizationId", async () => {
      vi.mocked(prisma.reimbursementType.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.reimbursementType.count).mockResolvedValue(0);

      await service.listTypes({
        page: 1,
        pageSize: 20,
        organizationId: mockOrganizationId,
      });

      expect(prisma.reimbursementType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: mockOrganizationId }),
        })
      );
    });

    it("should filter by categoryId when provided", async () => {
      vi.mocked(prisma.reimbursementType.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.reimbursementType.count).mockResolvedValue(0);

      await service.listTypes({
        page: 1,
        pageSize: 20,
        organizationId: mockOrganizationId,
        categoryId: "clxcat00000000000001",
      });

      expect(prisma.reimbursementType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: "clxcat00000000000001" }),
        })
      );
    });

    it("should return empty list when no types exist", async () => {
      vi.mocked(prisma.reimbursementType.findMany).mockResolvedValue([]);
      vi.mocked(prisma.reimbursementType.count).mockResolvedValue(0);

      const result = await service.listTypes({
        page: 1,
        pageSize: 20,
        organizationId: mockOrganizationId,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
    });
  });

  describe("getTypeById", () => {
    it("should return type when found", async () => {
      vi.mocked(prisma.reimbursementType.findUnique).mockResolvedValue(
        mockReimbursementType as never
      );

      const result = await service.getTypeById("clx1234567890abcdef2");

      expect(result).toMatchObject({
        id: "clx1234567890abcdef2",
        name: "Transportation",
        description: "Transportation expenses",
        organizationId: mockOrganizationId,
        categoryId: "clxcat00000000000001",
        category: {
          id: "clxcat00000000000001",
          name: "Scheduled",
        },
      });
      expect(prisma.reimbursementType.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clx1234567890abcdef2" },
        })
      );
    });

    it("should throw NotFound when type does not exist", async () => {
      vi.mocked(prisma.reimbursementType.findUnique).mockResolvedValue(null);

      await expect(service.getTypeById("nonexistent")).rejects.toThrow(
        "Reimbursement type not found"
      );
    });
  });

  describe("createType", () => {
    it("should create and return reimbursement type", async () => {
      vi.mocked(prisma.reimbursementType.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.reimbursementType.create).mockResolvedValue(mockReimbursementType as never);

      const result = await service.createType({
        name: "Transportation",
        description: "Transportation expenses",
        organizationId: mockOrganizationId,
        categoryId: "clxcat00000000000001",
      });

      expect(result).toMatchObject({
        id: "clx1234567890abcdef2",
        name: "Transportation",
        description: "Transportation expenses",
        organizationId: mockOrganizationId,
        categoryId: "clxcat00000000000001",
      });
      expect(prisma.reimbursementType.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Transportation",
            description: "Transportation expenses",
            organizationId: mockOrganizationId,
            categoryId: "clxcat00000000000001",
          }),
        })
      );
    });

    it("should create type with null description and no category when not provided", async () => {
      const typeNoDescNoCategory = {
        ...mockReimbursementType,
        description: null,
        categoryId: null,
        category: null,
      };
      vi.mocked(prisma.reimbursementType.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.reimbursementType.create).mockResolvedValue(typeNoDescNoCategory as never);

      const result = await service.createType({
        name: "Transportation",
        organizationId: mockOrganizationId,
      });

      expect(result.description).toBeNull();
      expect(result.categoryId).toBeNull();
      expect(result.category).toBeNull();
    });

    it("should throw Conflict when type name already exists in organization", async () => {
      vi.mocked(prisma.reimbursementType.findUnique).mockResolvedValue(
        mockReimbursementType as never
      );

      await expect(
        service.createType({
          name: "Transportation",
          organizationId: mockOrganizationId,
        })
      ).rejects.toThrow("Reimbursement type with this name already exists");
    });
  });

  describe("deleteType", () => {
    it("should delete type when found", async () => {
      vi.mocked(prisma.reimbursementType.findUnique).mockResolvedValue(
        mockReimbursementType as never
      );
      vi.mocked(prisma.reimbursementType.delete).mockResolvedValue(mockReimbursementType as never);

      await service.deleteType("clx1234567890abcdef2");

      expect(prisma.reimbursementType.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clx1234567890abcdef2" },
        })
      );
    });

    it("should throw NotFound when type does not exist", async () => {
      vi.mocked(prisma.reimbursementType.findUnique).mockResolvedValue(null);

      await expect(service.deleteType("nonexistent")).rejects.toThrow(
        "Reimbursement type not found"
      );
    });
  });

  // ==========================================================================
  // Reimbursement Roles
  // ==========================================================================

  describe("listRoles", () => {
    it("should return paginated roles list", async () => {
      vi.mocked(prisma.reimbursementRole.findMany).mockResolvedValue([
        mockReimbursementRole,
      ] as never);
      vi.mocked(prisma.reimbursementRole.count).mockResolvedValue(1);

      const result = await service.listRoles({
        page: 1,
        pageSize: 20,
        organizationId: mockOrganizationId,
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
        id: "clxrole0000000000001",
        name: "Employee",
        organizationId: mockOrganizationId,
      });
    });

    it("should filter by organizationId", async () => {
      vi.mocked(prisma.reimbursementRole.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.reimbursementRole.count).mockResolvedValue(0);

      await service.listRoles({
        page: 1,
        pageSize: 20,
        organizationId: mockOrganizationId,
      });

      expect(prisma.reimbursementRole.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: mockOrganizationId }),
        })
      );
    });

    it("should return empty list when no roles exist", async () => {
      vi.mocked(prisma.reimbursementRole.findMany).mockResolvedValue([]);
      vi.mocked(prisma.reimbursementRole.count).mockResolvedValue(0);

      const result = await service.listRoles({
        page: 1,
        pageSize: 20,
        organizationId: mockOrganizationId,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
    });
  });

  describe("getRoleById", () => {
    it("should return role when found", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue(
        mockReimbursementRole as never
      );

      const result = await service.getRoleById("clxrole0000000000001");

      expect(result).toMatchObject({
        id: "clxrole0000000000001",
        name: "Employee",
        organizationId: mockOrganizationId,
      });
      expect(prisma.reimbursementRole.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clxrole0000000000001" },
        })
      );
    });

    it("should throw NotFound when role does not exist", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue(null);

      await expect(service.getRoleById("nonexistent")).rejects.toThrow(
        "Reimbursement role not found"
      );
    });
  });

  describe("createRole", () => {
    it("should create and return role", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.reimbursementRole.create).mockResolvedValue(mockReimbursementRole as never);

      const result = await service.createRole({
        name: "Employee",
        organizationId: mockOrganizationId,
      });

      expect(result).toMatchObject({
        id: "clxrole0000000000001",
        name: "Employee",
        organizationId: mockOrganizationId,
      });
      expect(prisma.reimbursementRole.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: "Employee",
            organizationId: mockOrganizationId,
          },
        })
      );
    });

    it("should throw Conflict when role name already exists in organization", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue(
        mockReimbursementRole as never
      );

      await expect(
        service.createRole({
          name: "Employee",
          organizationId: mockOrganizationId,
        })
      ).rejects.toThrow("Reimbursement role with this name already exists");
    });
  });

  describe("deleteRole", () => {
    it("should delete role when found", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue(
        mockReimbursementRole as never
      );
      vi.mocked(prisma.reimbursementRole.delete).mockResolvedValue(mockReimbursementRole as never);

      await service.deleteRole("clxrole0000000000001");

      expect(prisma.reimbursementRole.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clxrole0000000000001" },
        })
      );
    });

    it("should throw NotFound when role does not exist", async () => {
      vi.mocked(prisma.reimbursementRole.findUnique).mockResolvedValue(null);

      await expect(service.deleteRole("nonexistent")).rejects.toThrow(
        "Reimbursement role not found"
      );
    });
  });

  // ==========================================================================
  // Reimbursement Type Categories
  // ==========================================================================

  describe("listTypeCategories", () => {
    it("should return paginated type categories list", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findMany).mockResolvedValue([
        mockReimbursementTypeCategory,
      ] as never);
      vi.mocked(prisma.reimbursementTypeCategory.count).mockResolvedValue(1);

      const result = await service.listTypeCategories({
        page: 1,
        pageSize: 20,
        organizationId: mockOrganizationId,
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
        id: "clxcat00000000000001",
        name: "Scheduled",
        organizationId: mockOrganizationId,
      });
    });

    it("should filter by organizationId", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.reimbursementTypeCategory.count).mockResolvedValue(0);

      await service.listTypeCategories({
        page: 1,
        pageSize: 20,
        organizationId: mockOrganizationId,
      });

      expect(prisma.reimbursementTypeCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: mockOrganizationId }),
        })
      );
    });

    it("should return empty list when no type categories exist", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findMany).mockResolvedValue([]);
      vi.mocked(prisma.reimbursementTypeCategory.count).mockResolvedValue(0);

      const result = await service.listTypeCategories({
        page: 1,
        pageSize: 20,
        organizationId: mockOrganizationId,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
    });
  });

  describe("getTypeCategoryById", () => {
    it("should return type category when found", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findUnique).mockResolvedValue(
        mockReimbursementTypeCategory as never
      );

      const result = await service.getTypeCategoryById("clxcat00000000000001");

      expect(result).toMatchObject({
        id: "clxcat00000000000001",
        name: "Scheduled",
        organizationId: mockOrganizationId,
      });
      expect(prisma.reimbursementTypeCategory.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clxcat00000000000001" },
        })
      );
    });

    it("should throw NotFound when type category does not exist", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findUnique).mockResolvedValue(null);

      await expect(service.getTypeCategoryById("nonexistent")).rejects.toThrow(
        "Reimbursement type category not found"
      );
    });
  });

  describe("createTypeCategory", () => {
    it("should create and return type category", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.reimbursementTypeCategory.create).mockResolvedValue(
        mockReimbursementTypeCategory as never
      );

      const result = await service.createTypeCategory({
        name: "Scheduled",
        organizationId: mockOrganizationId,
      });

      expect(result).toMatchObject({
        id: "clxcat00000000000001",
        name: "Scheduled",
        organizationId: mockOrganizationId,
      });
      expect(prisma.reimbursementTypeCategory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: "Scheduled",
            organizationId: mockOrganizationId,
          },
        })
      );
    });

    it("should throw Conflict when type category name already exists in organization", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findUnique).mockResolvedValue(
        mockReimbursementTypeCategory as never
      );

      await expect(
        service.createTypeCategory({
          name: "Scheduled",
          organizationId: mockOrganizationId,
        })
      ).rejects.toThrow("Reimbursement type category with this name already exists");
    });
  });

  describe("deleteTypeCategory", () => {
    it("should delete type category when found", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findUnique).mockResolvedValue(
        mockReimbursementTypeCategory as never
      );
      vi.mocked(prisma.reimbursementTypeCategory.delete).mockResolvedValue(
        mockReimbursementTypeCategory as never
      );

      await service.deleteTypeCategory("clxcat00000000000001");

      expect(prisma.reimbursementTypeCategory.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clxcat00000000000001" },
        })
      );
    });

    it("should throw NotFound when type category does not exist", async () => {
      vi.mocked(prisma.reimbursementTypeCategory.findUnique).mockResolvedValue(null);

      await expect(service.deleteTypeCategory("nonexistent")).rejects.toThrow(
        "Reimbursement type category not found"
      );
    });
  });
});

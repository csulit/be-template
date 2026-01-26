import { prisma } from "../../db.js";
import { NotFound, Conflict } from "../../lib/errors.js";
import { calculatePagination, getPrismaSkipTake } from "../../shared/utils/pagination.js";
import {
  toReimbursementUserDto,
  toReimbursementTypeDto,
  toReimbursementRoleDto,
  toReimbursementTypeCategoryDto,
} from "./reimbursement.dto.js";
import type {
  CreateReimbursementUserBody,
  UpdateReimbursementUserBody,
  CreateReimbursementTypeBody,
  ListReimbursementQuery,
  CreateReimbursementRoleBody,
  CreateReimbursementTypeCategoryBody,
  ListReimbursementRolesQuery,
  ListReimbursementTypeCategoriesQuery,
  ListReimbursementTypesQuery,
} from "./reimbursement.validator.js";

const REIMBURSEMENT_USER_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  role: true,
} as const;

const REIMBURSEMENT_TYPE_INCLUDE = {
  category: true,
} as const;

export class ReimbursementService {
  // =========================================================================
  // Reimbursement Users
  // =========================================================================

  async listUsers(query: ListReimbursementQuery) {
    const where = {
      organizationId: query.organizationId,
      ...(query.roleId && { roleId: query.roleId }),
    };

    const [items, totalItems] = await Promise.all([
      prisma.reimbursementUser.findMany({
        where,
        include: REIMBURSEMENT_USER_INCLUDE,
        ...getPrismaSkipTake(query),
        orderBy: { createdAt: "desc" },
      }),
      prisma.reimbursementUser.count({ where }),
    ]);

    return {
      success: true as const,
      data: items.map(toReimbursementUserDto),
      meta: calculatePagination(query, totalItems),
    };
  }

  async getUserById(id: string) {
    const record = await prisma.reimbursementUser.findUnique({
      where: { id },
      include: REIMBURSEMENT_USER_INCLUDE,
    });

    if (!record) {
      throw NotFound("Reimbursement user not found");
    }

    return toReimbursementUserDto(record);
  }

  async createUser(data: CreateReimbursementUserBody) {
    const existing = await prisma.reimbursementUser.findUnique({
      where: { userId_roleId: { userId: data.userId, roleId: data.roleId } },
    });

    if (existing) {
      throw Conflict("User already has this reimbursement role assigned");
    }

    const record = await prisma.reimbursementUser.create({
      data: { userId: data.userId, roleId: data.roleId, organizationId: data.organizationId },
      include: REIMBURSEMENT_USER_INCLUDE,
    });

    return toReimbursementUserDto(record);
  }

  async updateUser(id: string, data: UpdateReimbursementUserBody) {
    const existing = await prisma.reimbursementUser.findUnique({
      where: { id },
    });

    if (!existing) {
      throw NotFound("Reimbursement user not found");
    }

    if (data.roleId && data.roleId !== existing.roleId) {
      const conflict = await prisma.reimbursementUser.findUnique({
        where: { userId_roleId: { userId: existing.userId, roleId: data.roleId } },
      });

      if (conflict) {
        throw Conflict("User already has this reimbursement role assigned");
      }
    }

    const record = await prisma.reimbursementUser.update({
      where: { id },
      data: { ...(data.roleId && { roleId: data.roleId }) },
      include: REIMBURSEMENT_USER_INCLUDE,
    });

    return toReimbursementUserDto(record);
  }

  async deleteUser(id: string) {
    await this.getUserById(id);
    await prisma.reimbursementUser.delete({ where: { id } });
  }

  // =========================================================================
  // Reimbursement Types
  // =========================================================================

  async listTypes(query: ListReimbursementTypesQuery) {
    const where = {
      organizationId: query.organizationId,
      ...(query.categoryId && { categoryId: query.categoryId }),
    };

    const [items, totalItems] = await Promise.all([
      prisma.reimbursementType.findMany({
        where,
        include: REIMBURSEMENT_TYPE_INCLUDE,
        ...getPrismaSkipTake(query),
        orderBy: { createdAt: "desc" },
      }),
      prisma.reimbursementType.count({ where }),
    ]);

    return {
      success: true as const,
      data: items.map(toReimbursementTypeDto),
      meta: calculatePagination(query, totalItems),
    };
  }

  async getTypeById(id: string) {
    const record = await prisma.reimbursementType.findUnique({
      where: { id },
      include: REIMBURSEMENT_TYPE_INCLUDE,
    });

    if (!record) {
      throw NotFound("Reimbursement type not found");
    }

    return toReimbursementTypeDto(record);
  }

  async createType(data: CreateReimbursementTypeBody) {
    const existing = await prisma.reimbursementType.findUnique({
      where: { organizationId_name: { organizationId: data.organizationId, name: data.name } },
    });

    if (existing) {
      throw Conflict("Reimbursement type with this name already exists");
    }

    const record = await prisma.reimbursementType.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        organizationId: data.organizationId,
        categoryId: data.categoryId ?? null,
      },
      include: REIMBURSEMENT_TYPE_INCLUDE,
    });

    return toReimbursementTypeDto(record);
  }

  async deleteType(id: string) {
    await this.getTypeById(id);
    await prisma.reimbursementType.delete({ where: { id } });
  }

  // =========================================================================
  // Reimbursement Roles
  // =========================================================================

  async listRoles(query: ListReimbursementRolesQuery) {
    const where = {
      organizationId: query.organizationId,
    };

    const [items, totalItems] = await Promise.all([
      prisma.reimbursementRole.findMany({
        where,
        ...getPrismaSkipTake(query),
        orderBy: { createdAt: "desc" },
      }),
      prisma.reimbursementRole.count({ where }),
    ]);

    return {
      success: true as const,
      data: items.map(toReimbursementRoleDto),
      meta: calculatePagination(query, totalItems),
    };
  }

  async getRoleById(id: string) {
    const record = await prisma.reimbursementRole.findUnique({
      where: { id },
    });

    if (!record) {
      throw NotFound("Reimbursement role not found");
    }

    return toReimbursementRoleDto(record);
  }

  async createRole(data: CreateReimbursementRoleBody) {
    const existing = await prisma.reimbursementRole.findUnique({
      where: { organizationId_name: { organizationId: data.organizationId, name: data.name } },
    });

    if (existing) {
      throw Conflict("Reimbursement role with this name already exists in the organization");
    }

    const record = await prisma.reimbursementRole.create({
      data: {
        name: data.name,
        organizationId: data.organizationId,
      },
    });

    return toReimbursementRoleDto(record);
  }

  async deleteRole(id: string) {
    await this.getRoleById(id);
    await prisma.reimbursementRole.delete({ where: { id } });
  }

  // =========================================================================
  // Reimbursement Type Categories
  // =========================================================================

  async listTypeCategories(query: ListReimbursementTypeCategoriesQuery) {
    const where = {
      organizationId: query.organizationId,
    };

    const [items, totalItems] = await Promise.all([
      prisma.reimbursementTypeCategory.findMany({
        where,
        ...getPrismaSkipTake(query),
        orderBy: { createdAt: "desc" },
      }),
      prisma.reimbursementTypeCategory.count({ where }),
    ]);

    return {
      success: true as const,
      data: items.map(toReimbursementTypeCategoryDto),
      meta: calculatePagination(query, totalItems),
    };
  }

  async getTypeCategoryById(id: string) {
    const record = await prisma.reimbursementTypeCategory.findUnique({
      where: { id },
    });

    if (!record) {
      throw NotFound("Reimbursement type category not found");
    }

    return toReimbursementTypeCategoryDto(record);
  }

  async createTypeCategory(data: CreateReimbursementTypeCategoryBody) {
    const existing = await prisma.reimbursementTypeCategory.findUnique({
      where: { organizationId_name: { organizationId: data.organizationId, name: data.name } },
    });

    if (existing) {
      throw Conflict(
        "Reimbursement type category with this name already exists in the organization"
      );
    }

    const record = await prisma.reimbursementTypeCategory.create({
      data: {
        name: data.name,
        organizationId: data.organizationId,
      },
    });

    return toReimbursementTypeCategoryDto(record);
  }

  async deleteTypeCategory(id: string) {
    await this.getTypeCategoryById(id);
    await prisma.reimbursementTypeCategory.delete({ where: { id } });
  }
}

export const reimbursementService = new ReimbursementService();

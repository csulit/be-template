import { prisma } from "../../db.js";
import { NotFound, Conflict } from "../../lib/errors.js";
import { calculatePagination, getPrismaSkipTake } from "../../shared/utils/pagination.js";
import type {
  UpdateProfileInput,
  ListUsersQuery,
  AdminUpdateUserInput,
  BanUserInput,
  ListOrgMembersQuery,
  ListOrgsQuery,
  CreateOrgInput,
  UpdateOrgInput,
  SetOrgMemberRoleInput,
  TransferOwnershipInput,
} from "./users.validator.js";

export class UsersService {
  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw NotFound("User not found");
    }

    return user;
  }

  async updateProfile(id: string, data: UpdateProfileInput) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw NotFound("User not found");
    }

    // Build update data, converting undefined to skip
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.image !== undefined) updateData.image = data.image;

    return prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  // =========================================================================
  // Admin User Management
  // =========================================================================

  async listUsers(query: ListUsersQuery) {
    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    const [items, totalItems] = await Promise.all([
      prisma.user.findMany({
        where,
        ...getPrismaSkipTake(query),
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      success: true as const,
      data: items,
      meta: calculatePagination(query, totalItems),
    };
  }

  async adminUpdateUser(id: string, data: AdminUpdateUserInput) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw NotFound("User not found");
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.banned !== undefined) updateData.banned = data.banned;
    if (data.banReason !== undefined) updateData.banReason = data.banReason;
    if (data.banExpires !== undefined) {
      updateData.banExpires = data.banExpires ? new Date(data.banExpires) : null;
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async banUser(id: string, data: BanUserInput) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw NotFound("User not found");
    }

    return prisma.user.update({
      where: { id },
      data: {
        banned: true,
        banReason: data.banReason ?? null,
        banExpires: data.banExpires ? new Date(data.banExpires) : null,
      },
    });
  }

  async unbanUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw NotFound("User not found");
    }

    return prisma.user.update({
      where: { id },
      data: {
        banned: false,
        banReason: null,
        banExpires: null,
      },
    });
  }

  // =========================================================================
  // Organization Members
  // =========================================================================

  async listOrgMembers(query: ListOrgMembersQuery) {
    const where: Record<string, unknown> = {
      organizationId: query.organizationId,
    };

    if (query.role) {
      where.role = query.role;
    }

    const [items, totalItems] = await Promise.all([
      prisma.member.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        ...getPrismaSkipTake(query),
        orderBy: { createdAt: "desc" },
      }),
      prisma.member.count({ where }),
    ]);

    return {
      success: true as const,
      data: items,
      meta: calculatePagination(query, totalItems),
    };
  }

  // =========================================================================
  // Organization Management
  // =========================================================================

  async listOrgs(query: ListOrgsQuery) {
    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { slug: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      prisma.organization.findMany({
        where,
        ...getPrismaSkipTake(query),
        orderBy: { createdAt: "desc" },
      }),
      prisma.organization.count({ where }),
    ]);

    return {
      success: true as const,
      data: items,
      meta: calculatePagination(query, totalItems),
    };
  }

  async getOrgById(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw NotFound("Organization not found");
    }

    return org;
  }

  async createOrg(data: CreateOrgInput) {
    const existing = await prisma.organization.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw Conflict("Organization with this slug already exists");
    }

    return prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        logo: data.logo ?? null,
        metadata: data.metadata ?? null,
      },
    });
  }

  async updateOrg(orgId: string, data: UpdateOrgInput) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw NotFound("Organization not found");
    }

    if (data.slug && data.slug !== org.slug) {
      const existing = await prisma.organization.findUnique({
        where: { slug: data.slug },
      });

      if (existing) {
        throw Conflict("Organization with this slug already exists");
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.logo !== undefined) updateData.logo = data.logo;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    return prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });
  }

  async deleteOrg(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw NotFound("Organization not found");
    }

    await prisma.organization.delete({
      where: { id: orgId },
    });
  }

  async setOrgMemberRole(orgId: string, memberId: string, data: SetOrgMemberRoleInput) {
    const member = await prisma.member.findFirst({
      where: { id: memberId, organizationId: orgId },
    });

    if (!member) {
      throw NotFound("Member not found in this organization");
    }

    return prisma.member.update({
      where: { id: memberId },
      data: { role: data.role },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
  }

  async removeOrgMember(orgId: string, memberId: string) {
    const member = await prisma.member.findFirst({
      where: { id: memberId, organizationId: orgId },
    });

    if (!member) {
      throw NotFound("Member not found in this organization");
    }

    await prisma.member.delete({
      where: { id: memberId },
    });
  }

  async transferOrgOwnership(orgId: string, data: TransferOwnershipInput) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw NotFound("Organization not found");
    }

    const newOwnerMember = await prisma.member.findFirst({
      where: { userId: data.newOwnerId, organizationId: orgId },
    });

    if (!newOwnerMember) {
      throw NotFound("User is not a member of this organization");
    }

    const currentOwner = await prisma.member.findFirst({
      where: { organizationId: orgId, role: "owner" },
    });

    await prisma.$transaction(async (tx) => {
      if (currentOwner) {
        await tx.member.update({
          where: { id: currentOwner.id },
          data: { role: "admin" },
        });
      }

      await tx.member.update({
        where: { id: newOwnerMember.id },
        data: { role: "owner" },
      });
    });

    const updatedOrg = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!updatedOrg) {
      throw NotFound("Organization not found");
    }

    return updatedOrg;
  }
}

export const usersService = new UsersService();

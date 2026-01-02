import { prisma } from "../../db.js";
import { NotFound } from "../../lib/errors.js";
import type { UpdateProfileInput } from "./users.validator.js";

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
}

export const usersService = new UsersService();

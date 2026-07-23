import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            photo: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            photo: true,
          },
        },
      },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }
}

export const userRepository = new UserRepository();

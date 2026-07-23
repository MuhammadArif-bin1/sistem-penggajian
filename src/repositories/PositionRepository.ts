import { prisma } from "@/lib/prisma";
import { Prisma, EmployeeStatus } from "@prisma/client";

export class PositionRepository {
  async findAll(filters?: { search?: string; status?: string }) {
    const where: Prisma.PositionWhereInput = {};

    if (filters?.search) {
      where.name = {
        contains: filters.search,
        mode: "insensitive",
      };
    }

    if (filters?.status) {
      where.status = filters.status as EmployeeStatus;
    }

    return prisma.position.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.position.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.PositionCreateInput) {
    return prisma.position.create({ data });
  }

  async update(id: string, data: Prisma.PositionUpdateInput) {
    return prisma.position.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.position.delete({
      where: { id },
    });
  }
}

export const positionRepository = new PositionRepository();

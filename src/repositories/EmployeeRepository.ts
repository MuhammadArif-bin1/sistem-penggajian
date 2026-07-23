import { prisma } from "@/lib/prisma";
import { Prisma, EmployeeStatus } from "@prisma/client";

export class EmployeeRepository {
  async findAll(
    filters?: { search?: string; status?: string; positionId?: string; bankName?: string },
    skip?: number,
    take?: number | null,
  ) {
    const where: Prisma.EmployeeWhereInput = {};

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
        { bankAccount: { contains: filters.search, mode: "insensitive" } },
        { accountHolder: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.status) {
      where.status = filters.status as EmployeeStatus;
    }

    if (filters?.positionId) {
      where.positionId = filters.positionId;
    }

    if (filters?.bankName) {
      where.bankName = filters.bankName as any;
    }

    const query: Prisma.EmployeeFindManyArgs = {
      where,
      orderBy: { name: "asc" },
      include: {
        position: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    };

    if (typeof skip === "number") {
      query.skip = skip;
    }

    if (typeof take === "number" && take > 0) {
      query.take = take;
    }

    return prisma.employee.findMany(query);
  }

  async count(filters?: {
    search?: string;
    status?: string;
    positionId?: string;
    bankName?: string;
  }) {
    const where: Prisma.EmployeeWhereInput = {};

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
        { bankAccount: { contains: filters.search, mode: "insensitive" } },
        { accountHolder: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.status) {
      where.status = filters.status as EmployeeStatus;
    }

    if (filters?.positionId) {
      where.positionId = filters.positionId;
    }

    if (filters?.bankName) {
      where.bankName = filters.bankName as any;
    }

    return prisma.employee.count({ where });
  }

  async findById(id: string) {
    return prisma.employee.findUnique({
      where: { id },
      include: {
        position: true,
        user: true,
      },
    });
  }

  async findByUserId(userId: string) {
    return prisma.employee.findUnique({
      where: { userId },
      include: {
        position: true,
        user: true,
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.employee.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.EmployeeUncheckedCreateInput) {
    return prisma.employee.create({
      data,
      include: {
        position: true,
      },
    });
  }

  async update(id: string, data: Prisma.EmployeeUncheckedUpdateInput) {
    return prisma.employee.update({
      where: { id },
      data,
      include: {
        position: true,
      },
    });
  }

  async delete(id: string) {
    return prisma.employee.delete({
      where: { id },
    });
  }
}

export const employeeRepository = new EmployeeRepository();

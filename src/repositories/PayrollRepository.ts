import { prisma } from "@/lib/prisma";
import { Prisma, PayrollStatus } from "@prisma/client";

export class PayrollRepository {
  async findAll(filters?: { period?: string; employeeId?: string; status?: string; search?: string }) {
    const where: Prisma.PayrollWhereInput = {};

    if (filters?.period) {
      where.period = filters.period;
    }

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.status) {
      where.status = filters.status as PayrollStatus;
    }

    if (filters?.search) {
      where.employee = {
        name: { contains: filters.search, mode: "insensitive" },
      };
    }

    return prisma.payroll.findMany({
      where,
      orderBy: [
        { period: "desc" },
        { employee: { name: "asc" } }
      ],
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        salarySlips: true,
        overtimes: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.payroll.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        salarySlips: true,
        overtimes: true,
      },
    });
  }

  async findByEmployeeAndPeriod(employeeId: string, period: string) {
    return prisma.payroll.findUnique({
      where: {
        employeeId_period: {
          employeeId,
          period,
        },
      },
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        salarySlips: true,
        overtimes: true,
      },
    });
  }

  async create(data: Prisma.PayrollUncheckedCreateInput) {
    return prisma.payroll.create({
      data,
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        overtimes: true,
      },
    });
  }

  async update(id: string, data: Prisma.PayrollUncheckedUpdateInput) {
    return prisma.payroll.update({
      where: { id },
      data,
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        overtimes: true,
      },
    });
  }

  async createSalarySlip(payrollId: string, employeeId: string, qrCodeText: string) {
    return prisma.salarySlip.create({
      data: {
        payrollId,
        employeeId,
        qrCodeText,
      },
    });
  }

  async findSalarySlipById(id: string) {
    return prisma.salarySlip.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        payroll: {
          include: {
            overtimes: true,
          },
        },
      },
    });
  }

  async findSalarySlips(filters?: { period?: string; employeeId?: string }) {
    const where: Prisma.SalarySlipWhereInput = {};

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.period) {
      where.payroll = {
        period: filters.period,
      };
    }

    return prisma.salarySlip.findMany({
      where,
      orderBy: {
        payroll: {
          period: "desc",
        },
      },
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        payroll: {
          include: {
            overtimes: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    return prisma.payroll.delete({
      where: { id },
    });
  }
}

export const payrollRepository = new PayrollRepository();

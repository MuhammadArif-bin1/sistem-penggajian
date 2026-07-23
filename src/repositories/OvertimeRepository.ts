import { prisma } from "@/lib/prisma";
import { OvertimeStatus, Prisma } from "@prisma/client";

export interface OvertimeFilters {
  employeeId?: string;
  status?: string;
  month?: string; // "01" - "12" or "1" - "12"
  year?: string;  // e.g. "2026"
  date?: string;  // e.g. "2026-07-22"
  search?: string;
}

export class OvertimeRepository {
  async findAll(filters?: OvertimeFilters) {
    const where: Prisma.OvertimeWhereInput = {};

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status as OvertimeStatus;
    }

    if (filters?.date) {
      const targetDate = new Date(filters.date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      where.tanggal = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (filters?.month || filters?.year) {
      const year = filters.year ? parseInt(filters.year) : new Date().getFullYear();
      const month = filters.month ? parseInt(filters.month) - 1 : 0;
      
      const start = filters.month 
        ? new Date(year, month, 1)
        : new Date(year, 0, 1);
      const end = filters.month 
        ? new Date(year, month + 1, 0, 23, 59, 59, 999)
        : new Date(year, 11, 31, 23, 59, 59, 999);

      where.tanggal = {
        gte: start,
        lte: end,
      };
    }

    if (filters?.search) {
      where.OR = [
        { alasan: { contains: filters.search, mode: "insensitive" } },
        { employee: { name: { contains: filters.search, mode: "insensitive" } } },
        { employee: { department: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    return prisma.overtime.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            position: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { tanggal: "desc" },
        { createdAt: "desc" },
      ],
    });
  }

  async findById(id: string) {
    return prisma.overtime.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            position: {
              select: {
                name: true,
              },
            },
          },
        },
        payroll: true,
      },
    });
  }

  async findExistingOnDate(employeeId: string, tanggal: Date) {
    const startOfDay = new Date(tanggal);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(tanggal);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.overtime.findFirst({
      where: {
        employeeId,
        tanggal: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: [OvertimeStatus.PENDING, OvertimeStatus.APPROVED, OvertimeStatus.COMPLETED],
        },
      },
    });
  }

  async create(data: Prisma.OvertimeCreateInput) {
    return prisma.overtime.create({
      data,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });
  }

  async update(id: string, data: Prisma.OvertimeUpdateInput) {
    return prisma.overtime.update({
      where: { id },
      data,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    return prisma.overtime.delete({
      where: { id },
    });
  }

  async getSummaryStats(filters?: { employeeId?: string; month?: number; year?: number }) {
    const now = new Date();
    const currentYear = filters?.year || now.getFullYear();
    const currentMonth = filters?.month !== undefined ? filters.month : now.getMonth();

    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const baseWhere: Prisma.OvertimeWhereInput = {};
    if (filters?.employeeId) {
      baseWhere.employeeId = filters.employeeId;
    }

    const monthWhere: Prisma.OvertimeWhereInput = {
      ...baseWhere,
      tanggal: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    };

    const [totalRequests, pendingCount, approvedCount, monthOvertimes] = await Promise.all([
      prisma.overtime.count({ where: baseWhere }),
      prisma.overtime.count({ where: { ...baseWhere, status: OvertimeStatus.PENDING } }),
      prisma.overtime.count({
        where: {
          ...baseWhere,
          status: { in: [OvertimeStatus.APPROVED, OvertimeStatus.COMPLETED] },
        },
      }),
      prisma.overtime.findMany({
        where: {
          ...monthWhere,
          status: { in: [OvertimeStatus.APPROVED, OvertimeStatus.COMPLETED] },
        },
        select: {
          totalJam: true,
          nominalLembur: true,
        },
      }),
    ]);

    const totalHoursMonth = monthOvertimes.reduce((sum, item) => sum + item.totalJam, 0);
    const totalNominalMonth = monthOvertimes.reduce((sum, item) => sum + item.nominalLembur, 0);

    // Today's requests count
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));
    const todayRequestsCount = await prisma.overtime.count({
      where: {
        ...baseWhere,
        tanggal: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    return {
      totalRequests,
      pendingCount,
      approvedCount,
      totalHoursMonth,
      totalNominalMonth,
      todayRequestsCount,
    };
  }
}

export const overtimeRepository = new OvertimeRepository();

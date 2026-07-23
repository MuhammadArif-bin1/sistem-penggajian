import { prisma } from "@/lib/prisma";
import { activityLogService } from "./ActivityLogService";
import { LeaveType, LeaveStatus } from "@prisma/client";

export class LeaveService {
  async getLeaveRequests(filters?: { employeeId?: string; status?: string }, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.status) where.status = filters.status as LeaveStatus;

    const [items, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: { name: true, position: { select: { name: true } } },
          },
        },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createLeaveRequest(data: {
    employeeId: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
  }) {
    // Basic validation
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start > end) throw new Error("Tanggal mulai tidak boleh lebih dari tanggal selesai");

    // Check balance if CUTI
    if (data.type === "CUTI") {
      const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
      if (!employee) throw new Error("Karyawan tidak ditemukan");
      
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
      
      if (employee.leaveBalance < diffDays) {
        throw new Error(`Sisa cuti tidak mencukupi (Sisa: ${employee.leaveBalance}, Diajukan: ${diffDays})`);
      }
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: data.employeeId,
        type: data.type,
        startDate: start,
        endDate: end,
        reason: data.reason,
      },
    });

    return leave;
  }

  async updateLeaveStatus(id: string, status: LeaveStatus, actorId: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!leave) throw new Error("Pengajuan tidak ditemukan");

    if (status === "APPROVED" && leave.type === "CUTI" && leave.status !== "APPROVED") {
      const diffTime = Math.abs(leave.endDate.getTime() - leave.startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (leave.employee.leaveBalance < diffDays) {
        throw new Error("Sisa cuti karyawan tidak mencukupi untuk disetujui");
      }
      
      // Deduct balance
      await prisma.employee.update({
        where: { id: leave.employeeId },
        data: { leaveBalance: leave.employee.leaveBalance - diffDays },
      });
    }

    // If changing from APPROVED back to PENDING/REJECTED, restore balance
    if (leave.status === "APPROVED" && status !== "APPROVED" && leave.type === "CUTI") {
       const diffTime = Math.abs(leave.endDate.getTime() - leave.startDate.getTime());
       const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
       
       await prisma.employee.update({
         where: { id: leave.employeeId },
         data: { leaveBalance: leave.employee.leaveBalance + diffDays },
       });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status },
      include: { employee: true },
    });

    await activityLogService.log(
      actorId,
      `Mengubah status pengajuan ${leave.type} karyawan ${updated.employee.name} menjadi ${status}`,
      "UPDATE_LEAVE"
    );

    return updated;
  }
}

export const leaveService = new LeaveService();

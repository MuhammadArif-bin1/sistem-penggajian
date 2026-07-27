import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { payrollService } from "@/services/PayrollService";
import { activityLogService } from "@/services/ActivityLogService";
import { employeeService } from "@/services/EmployeeService";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const actor = getAuthUser(request);
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (actor.role === "ADMIN" || actor.role === "HR") {
      const stats = await payrollService.getDashboardStats();
      const logs = await activityLogService.getLogs(5);

      // Overtime statistics for Admin/HR
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const [monthOvertimes, todayRequests, pendingApproval] = await Promise.all([
        prisma.overtime.findMany({
          where: {
            tanggal: { gte: startOfMonth, lte: endOfMonth },
            status: { in: ["APPROVED", "COMPLETED"] },
          },
          select: { totalJam: true },
        }),
        prisma.overtime.count({
          where: { tanggal: { gte: startOfToday, lte: endOfToday } },
        }),
        prisma.overtime.count({
          where: { status: "PENDING" },
        }),
      ]);

      const totalHoursMonth = monthOvertimes.reduce((sum: number, item: { totalJam: number }) => sum + item.totalJam, 0);

      return NextResponse.json({
        success: true,
        message: "Statistik dashboard admin berhasil diambil",
        data: {
          ...stats,
          overtimeStats: {
            totalHours: totalHoursMonth,
            todayRequests,
            pendingApproval,
          },
          recentActivities: logs.map((l) => ({
            id: l.id,
            description: l.description,
            actionType: l.actionType,
            createdAt: l.createdAt,
            userEmail: l.user?.email || "System",
            userName: l.user?.employee?.name || "Admin",
          })),
        },
      });
    } else {
      // Employee stats
      if (!actor.employeeId) {
        return NextResponse.json({
          success: true,
          message: "Statistik dashboard karyawan (Karyawan tidak terhubung)",
          data: {
            employee: null,
            slips: [],
            totalSalaryYear: 0,
            lastSlip: null,
            overtimeStats: {
              monthHours: 0,
              monthNominal: 0,
              pendingCount: 0,
              lastStatus: null,
            },
          },
        });
      }

      const employee = await employeeService.getEmployeeById(actor.employeeId);
      const empStats = await payrollService.getEmployeeStats(actor.employeeId);

      // Overtime statistics for Employee
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const [empOvertimesMonth, empPendingCount, lastOvertime] = await Promise.all([
        prisma.overtime.findMany({
          where: {
            employeeId: actor.employeeId,
            tanggal: { gte: startOfMonth, lte: endOfMonth },
            status: { in: ["APPROVED", "COMPLETED"] },
          },
          select: { totalJam: true, nominalLembur: true },
        }),
        prisma.overtime.count({
          where: {
            employeeId: actor.employeeId,
            status: "PENDING",
          },
        }),
        prisma.overtime.findFirst({
          where: { employeeId: actor.employeeId },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const monthHours = empOvertimesMonth.reduce((sum: number, o: { totalJam: number; nominalLembur: number }) => sum + o.totalJam, 0);
      const monthNominal = empOvertimesMonth.reduce((sum: number, o: { totalJam: number; nominalLembur: number }) => sum + o.nominalLembur, 0);

      return NextResponse.json({
        success: true,
        message: "Statistik dashboard karyawan berhasil diambil",
        data: {
          employee,
          ...empStats,
          overtimeStats: {
            monthHours,
            monthNominal,
            pendingCount: empPendingCount,
            lastStatus: lastOvertime?.status || null,
          },
        },
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil statistik dashboard" },
      { status: 400 }
    );
  }
}

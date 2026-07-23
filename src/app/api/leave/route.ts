import { NextRequest, NextResponse } from "next/server";
import { leaveService } from "@/services/LeaveService";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const actor = getAuthUser(request);
    if (!actor) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // If EMPLOYEE, only show their own leaves
    let employeeId = searchParams.get("employeeId") || undefined;
    if (actor.role === "EMPLOYEE") {
      // Find employee by userId
      const { prisma } = require("@/lib/prisma");
      const emp = await prisma.employee.findUnique({ where: { userId: actor.userId } });
      if (!emp) {
         return NextResponse.json({ success: false, message: "Karyawan tidak ditemukan" }, { status: 404 });
      }
      employeeId = emp.id;
    }

    const result = await leaveService.getLeaveRequests({ employeeId, status }, page, limit);
    return NextResponse.json({
      success: true,
      message: "Data cuti/izin berhasil diambil",
      data: result.items,
      meta: result.meta,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = getAuthUser(request);
    if (!actor || actor.role !== "EMPLOYEE") {
      return NextResponse.json(
        { success: false, message: "Forbidden: Hanya karyawan yang bisa mengajukan" },
        { status: 403 }
      );
    }

    // Get employee id
    const { prisma } = require("@/lib/prisma");
    const emp = await prisma.employee.findUnique({ where: { userId: actor.userId } });
    if (!emp) {
      return NextResponse.json({ success: false, message: "Karyawan tidak ditemukan" }, { status: 404 });
    }

    const body = await request.json();
    const result = await leaveService.createLeaveRequest({
      employeeId: emp.id,
      ...body,
    });

    return NextResponse.json({
      success: true,
      message: "Pengajuan berhasil dikirim",
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal membuat pengajuan" },
      { status: 400 }
    );
  }
}

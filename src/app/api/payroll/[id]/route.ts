import { NextRequest, NextResponse } from "next/server";
import { payrollService } from "@/services/PayrollService";
import { getAuthUser } from "@/lib/auth";

type Params = Promise<{ id: string }>;

export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const actor = getAuthUser(request);
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const payroll = await payrollService.getPayrollById(id);

    // Security check: Employee can only see their own payroll slip
    if (actor.role === "EMPLOYEE" && payroll.employeeId !== actor.employeeId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Detail payroll berhasil diambil",
      data: payroll,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil detail payroll" },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  try {
    const actor = getAuthUser(request);
    if (!actor || (actor.role !== "ADMIN" && actor.role !== "HR")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const payroll = await payrollService.updatePayroll(id, body, actor.userId);

    return NextResponse.json({
      success: true,
      message: "Data payroll berhasil diperbarui",
      data: payroll,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui data payroll" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  try {
    const actor = getAuthUser(request);
    if (!actor || (actor.role !== "ADMIN" && actor.role !== "HR")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const payroll = await payrollService.deletePayroll(id, actor.userId);

    return NextResponse.json({
      success: true,
      message: "Data payroll berhasil dihapus",
      data: payroll,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus data payroll" },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { payrollService } from "@/services/PayrollService";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const actor = getAuthUser(request);
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || undefined;
    let employeeId = searchParams.get("employeeId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    // Security check: Employee can only see their own payroll
    if (actor.role === "EMPLOYEE") {
      if (!actor.employeeId) {
        return NextResponse.json({
          success: true,
          message: "Data payroll kosong (Karyawan tidak terhubung)",
          data: [],
        });
      }
      employeeId = actor.employeeId;
    }

    const payrolls = await payrollService.getPayrolls({ period, employeeId, status, search });
    return NextResponse.json({
      success: true,
      message: "Data payroll berhasil diambil",
      data: payrolls,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data payroll" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = getAuthUser(request);
    if (!actor || (actor.role !== "ADMIN" && actor.role !== "HR")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = await payrollService.generatePayroll(body, actor.userId);

    return NextResponse.json({
      success: true,
      message: `Berhasil generate payroll. Sukses: ${result.successCount}, Error: ${result.errors.length}`,
      data: result.data,
      errors: result.errors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal melakukan generate payroll" },
      { status: 400 }
    );
  }
}

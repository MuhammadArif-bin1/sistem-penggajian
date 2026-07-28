import { NextRequest, NextResponse } from "next/server";
import { payrollService } from "@/services/PayrollService";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const actor = getAuthUser(request);
    if (!actor || (actor.role !== "ADMIN" && actor.role !== "HR")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Akses khusus Admin atau HR" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = await payrollService.generatePayroll(body, actor.userId);

    if (result.successCount === 0 && result.errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: result.errors.join("; "),
        errors: result.errors,
      }, { status: 400 });
    }

    let message = `Berhasil generate payroll untuk ${result.successCount} karyawan (Periode: ${body.period})`;
    if (result.errors.length > 0) {
      message += `. (Catatan: ${result.errors.length} karyawan dilewati/sudah ada)`;
    }

    return NextResponse.json({
      success: true,
      message,
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

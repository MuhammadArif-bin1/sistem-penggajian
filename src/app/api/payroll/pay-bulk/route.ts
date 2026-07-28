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
    const result = await payrollService.bulkPayPayrolls(body, actor.userId);

    return NextResponse.json({
      success: true,
      message: `Berhasil memproses pembayaran gaji sekaligus untuk ${result.successCount} karyawan (Total: Rp ${result.totalPaidAmount.toLocaleString("id-ID")})`,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memproses pembayaran gaji sekaligus" },
      { status: 400 }
    );
  }
}

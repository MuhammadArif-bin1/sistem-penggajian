import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { payrollService } from "@/services/PayrollService";
import {
  generatePayrollCSV,
  generateMassTransferCSV,
  generateTaxesCSV,
} from "@/lib/excel";

export async function GET(request: NextRequest) {
  try {
    const actor = getAuthUser(request);

    if (!actor || (actor.role !== "ADMIN" && actor.role !== "HR")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;
    const status = searchParams.get("status") || undefined;
    const format = searchParams.get("format") || "json";

    const payrolls = await payrollService.getPayrolls({
      period,
      employeeId,
      status,
    });

    if (format === "csv" || format === "mass_transfer" || format === "taxes") {
      let csvContent = "";
      let fileName = "";

      if (format === "mass_transfer") {
        csvContent = generateMassTransferCSV(payrolls);
        fileName = `mass-transfer-${period || "semua"}.csv`;
      } else if (format === "taxes") {
        csvContent = generateTaxesCSV(payrolls);
        fileName = `laporan-pajak-bpjs-${period || "semua"}.csv`;
      } else {
        csvContent = generatePayrollCSV(payrolls);
        fileName = `laporan-payroll-${period || "semua"}.csv`;
      }

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Laporan payroll berhasil diambil",
      data: payrolls,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal mengambil laporan payroll",
      },
      { status: 400 },
    );
  }
}

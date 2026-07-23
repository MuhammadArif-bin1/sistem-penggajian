import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { overtimeService } from "@/services/OvertimeService";

export async function GET(request: NextRequest) {
  try {
    const actor = getAuthUser(request);
    if (!actor) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const month = searchParams.get("month") || undefined;
    const year = searchParams.get("year") || undefined;
    const date = searchParams.get("date") || undefined;
    const search = searchParams.get("search") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;

    const filters = {
      status,
      month,
      year,
      date,
      search,
      employeeId,
    };

    const overtimes = await overtimeService.getOvertimes(filters, {
      role: actor.role,
      employeeId: actor.employeeId || undefined,
    });

    const monthNum = month ? parseInt(month) - 1 : new Date().getMonth();
    const yearNum = year ? parseInt(year) : new Date().getFullYear();

    const stats = await overtimeService.getSummaryStats(
      { role: actor.role, employeeId: actor.employeeId || undefined },
      { month: monthNum, year: yearNum }
    );

    return NextResponse.json({
      success: true,
      data: overtimes,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data lembur" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = getAuthUser(request);
    if (!actor) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const overtime = await overtimeService.createOvertime(body, {
      userId: actor.userId,
      role: actor.role,
      employeeId: actor.employeeId || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Pengajuan lembur berhasil dikirim.",
      data: overtime,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal membuat pengajuan lembur" },
      { status: 400 }
    );
  }
}

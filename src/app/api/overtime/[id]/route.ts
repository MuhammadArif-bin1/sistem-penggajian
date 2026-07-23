import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { overtimeService } from "@/services/OvertimeService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = getAuthUser(request);
    if (!actor) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const overtime = await overtimeService.getOvertimeById(id, {
      role: actor.role,
      employeeId: actor.employeeId || undefined,
    });

    return NextResponse.json({ success: true, data: overtime });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil detail lembur." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = getAuthUser(request);
    if (!actor || actor.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden: Hanya Admin yang dapat menghapus lembur." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const deleted = await overtimeService.deleteOvertime(id, {
      userId: actor.userId,
      role: actor.role,
    });

    return NextResponse.json({
      success: true,
      message: "Data lembur berhasil dihapus.",
      data: deleted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus data lembur." },
      { status: 400 }
    );
  }
}

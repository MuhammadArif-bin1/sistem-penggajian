import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { overtimeService } from "@/services/OvertimeService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = getAuthUser(request);
    if (!actor || (actor.role !== "ADMIN" && actor.role !== "HR")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Hanya Admin atau HR yang berhak menolak lembur." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const catatan = body.catatan || undefined;

    const updated = await overtimeService.rejectOvertime(id, catatan, {
      userId: actor.userId,
      role: actor.role,
    });

    return NextResponse.json({
      success: true,
      message: "Pengajuan lembur ditolak.",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menolak lembur." },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { leaveService } from "@/services/LeaveService";
import { getAuthUser } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    
    if (!body.status) {
       return NextResponse.json({ success: false, message: "Status dibutuhkan" }, { status: 400 });
    }

    const result = await leaveService.updateLeaveStatus(id, body.status, actor.userId);

    return NextResponse.json({
      success: true,
      message: "Status berhasil diupdate",
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengupdate status" },
      { status: 400 }
    );
  }
}

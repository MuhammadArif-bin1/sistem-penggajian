import { NextRequest, NextResponse } from "next/server";
import { positionService } from "@/services/PositionService";
import { getAuthUser } from "@/lib/auth";

type Params = Promise<{ id: string }>;

export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const position = await positionService.getPositionById(id);
    return NextResponse.json({
      success: true,
      message: "Detail jabatan berhasil diambil",
      data: position,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil detail jabatan" },
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
    const position = await positionService.updatePosition(id, body, actor.userId);

    return NextResponse.json({
      success: true,
      message: "Jabatan berhasil diperbarui",
      data: position,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui jabatan" },
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
    const position = await positionService.deletePosition(id, actor.userId);

    return NextResponse.json({
      success: true,
      message: "Jabatan berhasil dihapus",
      data: position,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus jabatan" },
      { status: 400 }
    );
  }
}

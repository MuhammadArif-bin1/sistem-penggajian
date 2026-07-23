import { NextRequest, NextResponse } from "next/server";
import { positionService } from "@/services/PositionService";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;

    const positions = await positionService.getPositions({ search, status });
    return NextResponse.json({
      success: true,
      message: "Data jabatan berhasil diambil",
      data: positions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data jabatan" },
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
    const position = await positionService.createPosition(body, actor.userId);

    return NextResponse.json({
      success: true,
      message: "Jabatan berhasil ditambahkan",
      data: position,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menambahkan jabatan" },
      { status: 400 }
    );
  }
}

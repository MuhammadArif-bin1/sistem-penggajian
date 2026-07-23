import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { authService } from "@/services/AuthService";

export async function PUT(request: NextRequest) {
  try {
    const actor = getAuthUser(request);
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    await authService.changePassword(actor.userId, body);

    return NextResponse.json({
      success: true,
      message: "Kata sandi berhasil diperbarui",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal memperbarui kata sandi",
      },
      { status: 400 }
    );
  }
}

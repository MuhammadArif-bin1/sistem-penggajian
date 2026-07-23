import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/AuthService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await authService.resetPassword(body);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mereset kata sandi",
        errors: [],
      },
      { status: 400 }
    );
  }
}

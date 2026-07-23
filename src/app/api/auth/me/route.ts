import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-constants";
import { getAuthUser } from "@/lib/auth";
import { authService } from "@/services/AuthService";

function unauthenticatedResponse(clearCookie = false) {
  const response = NextResponse.json(
    { authenticated: false, user: null },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );

  if (clearCookie) {
    response.cookies.set(AUTH_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  }

  return response;
}

export async function GET(request: NextRequest) {
  const hasToken = request.cookies.has(AUTH_COOKIE_NAME);
  const actor = getAuthUser(request);

  if (!actor) {
    return unauthenticatedResponse(hasToken);
  }

  try {
    const user = await authService.getMe(actor.userId);
    return NextResponse.json(
      {
        authenticated: true,
        user,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return unauthenticatedResponse(true);
  }
}

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
    const updatedUser = await authService.updateProfile(actor.userId, body);

    return NextResponse.json({
      success: true,
      message: "Profil berhasil diperbarui",
      data: updatedUser,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal memperbarui profil",
      },
      { status: 400 }
    );
  }
}

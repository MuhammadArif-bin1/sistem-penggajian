import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/AuthService";
import { AUTH_COOKIE_NAME, getRoleHomePath } from "@/lib/auth-constants";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await authService.login(body);
    const redirectTo = getRoleHomePath(result.user.role);

    const response = NextResponse.json({
      authenticated: true,
      success: true,
      message: "Login berhasil",
      user: result.user,
      data: result.user,
      redirectTo,
    });

    response.cookies.set(AUTH_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          authenticated: false,
          success: false,
          message: "Data login tidak valid",
          errors: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        authenticated: false,
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Email atau password salah",
        errors: [],
      },
      { status: 401 }
    );
  }
}

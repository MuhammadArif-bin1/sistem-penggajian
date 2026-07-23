import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-constants";

export async function POST() {
  const response = NextResponse.json({
    authenticated: false,
    success: true,
    message: "Logout berhasil",
  });

  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}

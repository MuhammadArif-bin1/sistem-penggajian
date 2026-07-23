import { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "./auth-constants";
import { verifyJWT, JWTPayload } from "./jwt";

export function getAuthUser(request: NextRequest): JWTPayload | null {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJWT(token);
}

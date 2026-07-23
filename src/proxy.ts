import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getRoleHomePath,
  LOGIN_PATH,
} from "@/lib/auth-constants";
import { verifyJWT, type JWTPayload } from "@/lib/jwt";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const MANAGEMENT_PAGE_PREFIXES = [
  "/employees",
  "/positions",
  "/departments",
  "/penggajian",
  "/payroll",
  "/reports",
];

const ADMIN_ONLY_PAGE_PREFIXES = [
  "/users",
  "/settings",
  "/roles",
  "/manajemen-user",
  "/pengaturan",
];

const DASHBOARD_ALIAS_PATHS = [
  "/dashboard",
  "/hr/dashboard",
  "/employee/dashboard",
];

function isPathOrChild(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublicAuthPath(pathname: string) {
  return (
    isPathOrChild(pathname, LOGIN_PATH) || isPathOrChild(pathname, "/register")
  );
}

function isDashboardAliasPath(pathname: string) {
  return DASHBOARD_ALIAS_PATHS.some((prefix) => isPathOrChild(pathname, prefix));
}

function getPayload(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJWT(token);
}

function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}

function redirectToLogin(request: NextRequest, clearCookie = false) {
  const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  return clearCookie ? clearAuthCookie(response) : response;
}

function unauthorizedJson(clearCookie = false) {
  const response = NextResponse.json(
    { success: false, message: "Unauthorized" },
    { status: 401 }
  );

  return clearCookie ? clearAuthCookie(response) : response;
}

function redirectToHome(request: NextRequest, payload: JWTPayload) {
  return NextResponse.redirect(new URL(getRoleHomePath(payload.role), request.url));
}

function canAccessManagementPage(role: JWTPayload["role"]) {
  return role === "ADMIN" || role === "HR";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api");
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (isPublicAuthPath(pathname)) {
    if (!token) {
      return NextResponse.next();
    }

    const payload = getPayload(request);
    if (!payload) {
      return clearAuthCookie(NextResponse.next());
    }

    return redirectToHome(request, payload);
  }

  if (!token) {
    return isApiRoute ? unauthorizedJson() : redirectToLogin(request);
  }

  const payload = getPayload(request);
  if (!payload) {
    return isApiRoute ? unauthorizedJson(true) : redirectToLogin(request, true);
  }

  if (isDashboardAliasPath(pathname)) {
    return redirectToHome(request, payload);
  }

  const isManagementPage = MANAGEMENT_PAGE_PREFIXES.some((prefix) =>
    isPathOrChild(pathname, prefix)
  );

  if (isManagementPage && !canAccessManagementPage(payload.role)) {
    return redirectToHome(request, payload);
  }

  const isAdminOnlyPage = ADMIN_ONLY_PAGE_PREFIXES.some((prefix) =>
    isPathOrChild(pathname, prefix)
  );

  if (isAdminOnlyPage && payload.role !== "ADMIN") {
    return redirectToHome(request, payload);
  }

  if (isApiRoute) {
    const isWriteRequest = ["POST", "PUT", "DELETE", "PATCH"].includes(
      request.method
    );
    const isManagementApi =
      pathname.startsWith("/api/positions") ||
      pathname.startsWith("/api/employees") ||
      pathname.startsWith("/api/payroll");

    if (
      isManagementApi &&
      isWriteRequest &&
      !canAccessManagementPage(payload.role)
    ) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/dashboard/:path*",
    "/hr/dashboard/:path*",
    "/employee/dashboard/:path*",
    "/employees/:path*",
    "/positions/:path*",
    "/departments/:path*",
    "/penggajian/:path*",
    "/payroll/:path*",
    "/attendance/:path*",
    "/absensi/:path*",
    "/cuti/:path*",
    "/slips/:path*",
    "/reports/:path*",
    "/profile/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/api/employees/:path*",
    "/api/positions/:path*",
    "/api/payroll/:path*",
    "/api/attendance/:path*",
    "/api/leave/:path*",
    "/api/reports/:path*",
    "/api/dashboard/:path*",
  ],
};

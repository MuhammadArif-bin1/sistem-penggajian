export const AUTH_COOKIE_NAME = "token";
export const LOGIN_PATH = "/login";
export const APP_DASHBOARD_PATH = "/";

export type AuthRole = "ADMIN" | "HR" | "EMPLOYEE";

export function getRoleHomePath(role?: AuthRole | null) {
  if (role === "ADMIN" || role === "HR" || role === "EMPLOYEE") {
    return APP_DASHBOARD_PATH;
  }

  return APP_DASHBOARD_PATH;
}

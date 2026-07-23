import jwt, { type SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "payroll-secret-key-12345";

export interface JWTPayload {
  userId: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE" | "HR";
  employeeId?: string | null;
}

export function signJWT(
  payload: JWTPayload,
  expiresIn: SignOptions["expiresIn"] = "7d"
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

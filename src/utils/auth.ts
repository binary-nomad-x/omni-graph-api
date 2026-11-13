import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { JwtPayload } from "@gql-prisma-api/types/context.js";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: Pick<JwtPayload, "userId" | "email"> & { role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

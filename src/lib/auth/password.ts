import crypto from "node:crypto";

export function normalizeFullName(firstName: string, lastName: string): string {
  const cleanFirst = firstName.trim().replace(/\s+/g, " ").toLowerCase();
  const cleanLast = lastName.trim().replace(/\s+/g, " ").toLowerCase();
  return `${cleanFirst} ${cleanLast}`.trim();
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  const actual = crypto.scryptSync(password, salt, 64);

  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}


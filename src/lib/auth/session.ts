import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "mh_session";
export type AppRole = "ADMIN" | "MEMBER";

function getSessionSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ||
    "fallback-dev-only-secret-change-in-production-32chars";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  role: AppRole;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(getSessionSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecretKey());
    if (!payload.sub) {
      return null;
    }
    const role: AppRole = payload.role === "ADMIN" ? "ADMIN" : "MEMBER";
    return {
      userId: payload.sub,
      role,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const verified = await verifySessionToken(rawToken);
  if (!verified) return null;

  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: {
      id: true,
      fullNameKey: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      preferredLang: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  if (user.status !== "APPROVED") {
    throw new Error("PENDING_APPROVAL");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeFullName, verifyPassword } from "@/lib/auth/password";
import { setSessionCookie, signSessionToken } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api-utils";

const loginSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const fullNameKey = normalizeFullName(body.firstName, body.lastName);

    const user = await prisma.user.findUnique({
      where: { fullNameKey },
    });

    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    const token = await signSessionToken({
      userId: user.id,
      role: user.role === "ADMIN" ? "ADMIN" : "MEMBER",
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        preferredLang: user.preferredLang,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}


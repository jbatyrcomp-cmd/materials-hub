import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, normalizeFullName } from "@/lib/auth/password";
import { setSessionCookie, signSessionToken } from "@/lib/auth/session";
import { handleApiError, safeUserSelect } from "@/lib/api-utils";

const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  password: z.string().min(4).max(100),
  preferredLang: z.enum(["uz", "tk"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = registerSchema.parse(await req.json());
    const fullNameKey = normalizeFullName(body.firstName, body.lastName);

    const existing = await prisma.user.findUnique({
      where: { fullNameKey },
    });
    if (existing) {
      return NextResponse.json(
        { error: "USER_ALREADY_EXISTS" },
        { status: 409 }
      );
    }

    const user = await prisma.$transaction(async (tx) => {
      const adminCount = await tx.user.count({
        where: { role: "ADMIN" },
      });
      const isFirstAdmin = adminCount === 0;

      return tx.user.create({
        data: {
          fullNameKey,
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          passwordHash: hashPassword(body.password),
          role: isFirstAdmin ? "ADMIN" : "MEMBER",
          status: isFirstAdmin ? "APPROVED" : "PENDING",
          preferredLang: body.preferredLang ?? "uz",
        },
        select: safeUserSelect,
      });
    });

    const token = await signSessionToken({
      userId: user.id,
      role: user.role === "ADMIN" ? "ADMIN" : "MEMBER",
    });
    await setSessionCookie(token);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}


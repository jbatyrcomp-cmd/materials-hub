import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth/session";
import { handleApiError, safeUserSelect } from "@/lib/api-utils";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  preferredLang: z.enum(["uz", "tk"]),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { preferredLang } = patchSchema.parse(await req.json());
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { preferredLang },
      select: safeUserSelect,
    });
    return NextResponse.json({ user: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

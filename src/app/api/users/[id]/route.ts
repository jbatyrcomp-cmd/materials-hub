import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { handleApiError, safeUserSelect } from "@/lib/api-utils";

const patchSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  role: z.enum(["ADMIN", "MEMBER"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = patchSchema.parse(await req.json());

    if (id === admin.id && (body.status === "REJECTED" || body.role === "MEMBER")) {
      return NextResponse.json(
        { error: "Cannot demote or reject your own admin account" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.role ? { role: body.role } : {}),
      },
      select: safeUserSelect,
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    return handleApiError(error);
  }
}


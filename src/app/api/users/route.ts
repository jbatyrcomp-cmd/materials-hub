import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { handleApiError, safeUserSelect } from "@/lib/api-utils";

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      orderBy: [{ createdAt: "desc" }],
      select: {
        ...safeUserSelect,
        createdAt: true,
        _count: {
          select: {
            materials: true,
            testAttempts: true,
            flashcardDecks: true,
          },
        },
      },
    });

    // Put PENDING requests first for admin convenience
    users.sort((a, b) => {
      if (a.status === "PENDING" && b.status !== "PENDING") return -1;
      if (a.status !== "PENDING" && b.status === "PENDING") return 1;
      return 0;
    });

    return NextResponse.json({ users });
  } catch (error) {
    return handleApiError(error);
  }
}

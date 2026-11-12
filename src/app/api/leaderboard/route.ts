import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, safeUserSelect } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const subjectId = req.nextUrl.searchParams.get("subjectId")?.trim() || "";

    const attempts = await prisma.testAttempt.findMany({
      where: {
        submittedAt: { not: null },
        ...(subjectId ? { test: { subjectId } } : {}),
      },
      include: {
        user: { select: safeUserSelect },
      },
    });

    const grouped = new Map<
      string,
      {
        user: {
          id: string;
          firstName: string;
          lastName: string;
          role: string;
          status: string;
          preferredLang: string;
        };
        testsTaken: number;
        totalScore: number;
        totalMaxScore: number;
        totalDurationSeconds: number;
      }
    >();

    for (const att of attempts) {
      const existing = grouped.get(att.userId);
      if (existing) {
        existing.testsTaken += 1;
        existing.totalScore += att.score;
        existing.totalMaxScore += att.maxScore;
        existing.totalDurationSeconds += att.durationSeconds;
      } else {
        grouped.set(att.userId, {
          user: att.user,
          testsTaken: 1,
          totalScore: att.score,
          totalMaxScore: att.maxScore,
          totalDurationSeconds: att.durationSeconds,
        });
      }
    }

    const rankings = Array.from(grouped.values())
      .map((entry) => ({
        ...entry,
        accuracyPercent:
          entry.totalMaxScore > 0
            ? Math.round((entry.totalScore / entry.totalMaxScore) * 100)
            : 0,
      }))
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (a.totalDurationSeconds !== b.totalDurationSeconds) {
          return a.totalDurationSeconds - b.totalDurationSeconds;
        }
        return b.testsTaken - a.testsTaken;
      });

    return NextResponse.json({ rankings });
  } catch (error) {
    return handleApiError(error);
  }
}


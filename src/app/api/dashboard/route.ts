import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, safeUserSelect } from "@/lib/api-utils";

export async function GET() {
  try {
    const user = await requireUser();
    const now = new Date();

    const [
      totalMaterials,
      recentMaterials,
      popularMaterials,
      upcomingTasks,
      allCards,
      publishedTestsCount,
    ] = await Promise.all([
      prisma.material.count(),
      prisma.material.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          subject: true,
          author: { select: safeUserSelect },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.material.findMany({
        orderBy: [{ viewsCount: "desc" }, { createdAt: "desc" }],
        take: 5,
        include: {
          subject: true,
          author: { select: safeUserSelect },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.deadlineTask.findMany({
        where: {
          dueAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { dueAt: "asc" },
        take: 5,
        include: {
          subject: true,
          completions: { where: { userId: user.id }, select: { taskId: true } },
        },
      }),
      prisma.flashcard.findMany({
        select: {
          id: true,
          progress: {
            where: { userId: user.id },
            select: { nextReviewAt: true },
          },
        },
      }),
      prisma.officialTest.count({ where: { isPublished: true } }),
    ]);

    const dueFlashcards = allCards.filter((card) => {
      const p = card.progress[0];
      return !p || p.nextReviewAt <= now;
    }).length;

    return NextResponse.json({
      stats: {
        totalMaterials,
        upcomingDeadlines: upcomingTasks.filter((t) => t.completions.length === 0)
          .length,
        dueFlashcards,
        publishedTestsCount,
      },
      recentMaterials,
      popularMaterials,
      upcomingTasks: upcomingTasks.map((t) => ({
        ...t,
        isCompleted: t.completions.length > 0,
        completions: undefined,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}


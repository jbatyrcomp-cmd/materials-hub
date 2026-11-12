import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api-utils";
import { parseJsonSafe } from "@/lib/utils";
import { computeRemainingSeconds, gradeTestAttempt } from "@/lib/quiz";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    const test = await prisma.officialTest.findUnique({
      where: { id },
      include: {
        subject: true,
        questions: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!test || (!test.isPublished && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    let attempt = await prisma.testAttempt.findUnique({
      where: { testId_userId: { testId: test.id, userId: user.id } },
    });

    // Auto-finalize expired active attempt
    if (attempt && !attempt.submittedAt && attempt.expiresAt <= new Date()) {
      const savedAnswers = parseJsonSafe<Record<string, string[]>>(
        attempt.answersJson,
        {}
      );
      const gradeable = test.questions.map((q) => ({
        id: q.id,
        points: q.points,
        correctOptionIds: parseJsonSafe<string[]>(q.correctOptionIdsJson, []),
      }));
      const graded = gradeTestAttempt(gradeable, savedAnswers);
      const durationSeconds = Math.max(
        1,
        Math.floor(
          (attempt.expiresAt.getTime() - attempt.startedAt.getTime()) / 1000
        )
      );
      attempt = await prisma.testAttempt.update({
        where: { id: attempt.id },
        data: {
          submittedAt: attempt.expiresAt,
          score: graded.score,
          maxScore: graded.maxScore,
          durationSeconds,
        },
      });
    }

    const revealAnswers = Boolean(attempt?.submittedAt) || user.role === "ADMIN";
    const orderIds = parseJsonSafe<string[]>(attempt?.questionOrderJson, []);

    const sortedQuestions =
      orderIds.length > 0
        ? [...test.questions].sort(
            (a, b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id)
          )
        : test.questions;

    const safeQuestions = sortedQuestions.map((q) => ({
      id: q.id,
      orderIndex: q.orderIndex,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      options: parseJsonSafe<Array<{ id: string; text: string }>>(q.optionsJson, []),
      correctOptionIds: revealAnswers
        ? parseJsonSafe<string[]>(q.correctOptionIdsJson, [])
        : undefined,
      explanation: revealAnswers ? q.explanation : undefined,
    }));

    return NextResponse.json({
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        durationMinutes: test.durationMinutes,
        isPublished: test.isPublished,
        shuffleQuestions: test.shuffleQuestions,
        subject: test.subject,
        questions: safeQuestions,
      },
      attempt: attempt
        ? {
            id: attempt.id,
            startedAt: attempt.startedAt,
            expiresAt: attempt.expiresAt,
            submittedAt: attempt.submittedAt,
            score: attempt.score,
            maxScore: attempt.maxScore,
            durationSeconds: attempt.durationSeconds,
            answers: parseJsonSafe<Record<string, string[]>>(
              attempt.answersJson,
              {}
            ),
            remainingSeconds: attempt.submittedAt
              ? 0
              : computeRemainingSeconds(attempt.expiresAt),
          }
        : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  isPublished: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const { isPublished } = patchSchema.parse(await req.json());
    const test = await prisma.officialTest.update({
      where: { id },
      data: { isPublished },
    });
    return NextResponse.json({ test });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    await prisma.officialTest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}


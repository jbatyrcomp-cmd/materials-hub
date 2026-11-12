import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api-utils";
import { parseJsonSafe } from "@/lib/utils";
import {
  computeRemainingSeconds,
  gradeTestAttempt,
  shuffleArray,
} from "@/lib/quiz";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    const test = await prisma.officialTest.findUnique({
      where: { id },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });

    if (!test || !test.isPublished) {
      return NextResponse.json({ error: "Test not available" }, { status: 404 });
    }

    const existing = await prisma.testAttempt.findUnique({
      where: { testId_userId: { testId: test.id, userId: user.id } },
    });

    if (existing) {
      if (existing.submittedAt) {
        return NextResponse.json(
          { error: "Already attempted" },
          { status: 409 }
        );
      }
      return NextResponse.json({
        attempt: existing,
        remainingSeconds: computeRemainingSeconds(existing.expiresAt),
      });
    }

    const questionIds = test.questions.map((q) => q.id);
    const ordered = test.shuffleQuestions
      ? shuffleArray(questionIds)
      : questionIds;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + test.durationMinutes * 60 * 1000);
    const maxScore = test.questions.reduce(
      (sum, q) => sum + Math.max(1, q.points),
      0
    );

    const attempt = await prisma.testAttempt.create({
      data: {
        testId: test.id,
        userId: user.id,
        questionOrderJson: JSON.stringify(ordered),
        answersJson: "{}",
        startedAt: now,
        expiresAt,
        maxScore,
      },
    });

    return NextResponse.json(
      {
        attempt,
        remainingSeconds: computeRemainingSeconds(expiresAt, now),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

const answersSchema = z.object({
  answers: z.record(z.string(), z.array(z.string())),
});

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const { answers } = answersSchema.parse(await req.json());

    const attempt = await prisma.testAttempt.findUnique({
      where: { testId_userId: { testId: id, userId: user.id } },
    });

    if (!attempt || attempt.submittedAt) {
      return NextResponse.json(
        { error: "Attempt already submitted or missing" },
        { status: 400 }
      );
    }

    if (Date.now() > attempt.expiresAt.getTime() + 5000) {
      return NextResponse.json({ error: "Time expired" }, { status: 409 });
    }

    await prisma.testAttempt.update({
      where: { id: attempt.id },
      data: { answersJson: JSON.stringify(answers) },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

const submitSchema = z.object({
  answers: z.record(z.string(), z.array(z.string())).optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = submitSchema.parse(await req.json().catch(() => ({})));

    const test = await prisma.officialTest.findUnique({
      where: { id },
      include: { questions: true },
    });
    if (!test) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const attempt = await prisma.testAttempt.findUnique({
      where: { testId_userId: { testId: id, userId: user.id } },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not started" }, { status: 404 });
    }
    if (attempt.submittedAt) {
      return NextResponse.json({ attempt });
    }

    const now = new Date();
    const savedAnswers = parseJsonSafe<Record<string, string[]>>(
      attempt.answersJson,
      {}
    );
    // If still within grace window, accept client answers; if expired, grade last saved
    const withinWindow = now.getTime() <= attempt.expiresAt.getTime() + 5000;
    const finalAnswers =
      withinWindow && body.answers ? body.answers : savedAnswers;

    const gradeable = test.questions.map((q) => ({
      id: q.id,
      points: q.points,
      correctOptionIds: parseJsonSafe<string[]>(q.correctOptionIdsJson, []),
    }));
    const graded = gradeTestAttempt(gradeable, finalAnswers);

    const effectiveEnd =
      now.getTime() > attempt.expiresAt.getTime() ? attempt.expiresAt : now;
    const durationSeconds = Math.max(
      1,
      Math.floor((effectiveEnd.getTime() - attempt.startedAt.getTime()) / 1000)
    );

    const updated = await prisma.testAttempt.update({
      where: { id: attempt.id },
      data: {
        answersJson: JSON.stringify(finalAnswers),
        submittedAt: effectiveEnd,
        score: graded.score,
        maxScore: graded.maxScore,
        durationSeconds,
      },
    });

    return NextResponse.json({
      attempt: updated,
      breakdown: graded.breakdown,
    });
  } catch (error) {
    return handleApiError(error);
  }
}


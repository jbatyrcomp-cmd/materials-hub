import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const user = await requireUser();
    const where = user.role === "ADMIN" ? {} : { isPublished: true };

    const tests = await prisma.officialTest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        subject: true,
        _count: { select: { questions: true, attempts: true } },
        attempts: {
          where: { userId: user.id },
          select: {
            id: true,
            startedAt: true,
            expiresAt: true,
            submittedAt: true,
            score: true,
            maxScore: true,
            durationSeconds: true,
          },
        },
      },
    });

    const formatted = tests.map((t) => ({
      ...t,
      myAttempt: t.attempts[0] ?? null,
      attempts: undefined,
    }));

    return NextResponse.json({ tests: formatted });
  } catch (error) {
    return handleApiError(error);
  }
}

const questionSchema = z.object({
  type: z.enum(["SINGLE", "MULTI"]).default("SINGLE"),
  prompt: z.string().trim().min(1).max(1000),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().trim().min(1).max(400),
      })
    )
    .min(2),
  correctOptionIds: z.array(z.string().min(1)).min(1),
  points: z.number().int().min(1).max(100).default(1),
  explanation: z.string().trim().max(1000).optional(),
});

const createTestSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  durationMinutes: z.number().int().min(1).max(180),
  shuffleQuestions: z.boolean().default(true),
  isPublished: z.boolean().default(true),
  questions: z.array(questionSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = createTestSchema.parse(await req.json());

    const test = await prisma.officialTest.create({
      data: {
        subjectId: body.subjectId,
        title: body.title,
        description: body.description ?? null,
        durationMinutes: body.durationMinutes,
        shuffleQuestions: body.shuffleQuestions,
        isPublished: body.isPublished,
        createdById: admin.id,
        questions: {
          create: body.questions.map((q, index) => ({
            orderIndex: index,
            type: q.type,
            prompt: q.prompt,
            optionsJson: JSON.stringify(q.options),
            correctOptionIdsJson: JSON.stringify(q.correctOptionIds),
            points: q.points,
            explanation: q.explanation ?? null,
          })),
        },
      },
      include: {
        subject: true,
        _count: { select: { questions: true } },
      },
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}


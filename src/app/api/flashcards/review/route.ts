import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api-utils";
import { calculateSm2 } from "@/lib/sm2";

const schema = z.object({
  cardId: z.string().min(1),
  rating: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { cardId, rating } = schema.parse(await req.json());

    const card = await prisma.flashcard.findUnique({ where: { id: cardId } });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const existing = await prisma.flashcardProgress.findUnique({
      where: { userId_cardId: { userId: user.id, cardId } },
    });

    const now = new Date();
    const next = calculateSm2(existing, rating, now);

    const updated = await prisma.flashcardProgress.upsert({
      where: { userId_cardId: { userId: user.id, cardId } },
      update: {
        easeFactor: next.easeFactor,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        nextReviewAt: next.nextReviewAt,
        lastReviewedAt: now,
      },
      create: {
        userId: user.id,
        cardId,
        easeFactor: next.easeFactor,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        nextReviewAt: next.nextReviewAt,
        lastReviewedAt: now,
      },
    });

    return NextResponse.json({ progress: updated });
  } catch (error) {
    return handleApiError(error);
  }
}


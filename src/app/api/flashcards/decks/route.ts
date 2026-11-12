import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, safeUserSelect } from "@/lib/api-utils";
import { parseBulkFlashcards } from "@/lib/flashcards";

export async function GET() {
  try {
    const user = await requireUser();
    const now = new Date();

    const decks = await prisma.flashcardDeck.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subject: true,
        author: { select: safeUserSelect },
        cards: {
          select: {
            id: true,
            progress: {
              where: { userId: user.id },
              select: { nextReviewAt: true },
            },
          },
        },
      },
    });

    const formatted = decks.map((deck) => {
      const totalCards = deck.cards.length;
      const dueCards = deck.cards.filter((card) => {
        const prog = card.progress[0];
        return !prog || prog.nextReviewAt <= now;
      }).length;

      return {
        id: deck.id,
        title: deck.title,
        description: deck.description,
        subject: deck.subject,
        author: deck.author,
        createdAt: deck.createdAt,
        totalCards,
        dueCards,
      };
    });

    return NextResponse.json({ decks: formatted });
  } catch (error) {
    return handleApiError(error);
  }
}

const createDeckSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).optional(),
  cards: z
    .array(
      z.object({
        front: z.string().trim().min(1).max(1000),
        back: z.string().trim().min(1).max(2000),
      })
    )
    .optional(),
  bulkText: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = createDeckSchema.parse(await req.json());

    const cards = [
      ...(body.cards ?? []),
      ...(body.bulkText ? parseBulkFlashcards(body.bulkText) : []),
    ];

    if (cards.length === 0) {
      return NextResponse.json(
        { error: "At least one flashcard is required" },
        { status: 400 }
      );
    }

    const deck = await prisma.flashcardDeck.create({
      data: {
        subjectId: body.subjectId,
        title: body.title,
        description: body.description ?? null,
        authorId: user.id,
        cards: {
          create: cards.map((card, index) => ({
            front: card.front,
            back: card.back,
            orderIndex: index,
          })),
        },
      },
      include: {
        subject: true,
        _count: { select: { cards: true } },
      },
    });

    return NextResponse.json({ deck }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}


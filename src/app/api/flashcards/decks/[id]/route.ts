import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, safeUserSelect } from "@/lib/api-utils";
import { parseBulkFlashcards } from "@/lib/flashcards";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const now = new Date();

    const deck = await prisma.flashcardDeck.findUnique({
      where: { id },
      include: {
        subject: true,
        author: { select: safeUserSelect },
        cards: {
          orderBy: { orderIndex: "asc" },
          include: {
            progress: {
              where: { userId: user.id },
              take: 1,
            },
          },
        },
      },
    });

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    const cards = deck.cards.map((card) => {
      const prog = card.progress[0] ?? null;
      const isDue = !prog || prog.nextReviewAt <= now;
      return {
        id: card.id,
        front: card.front,
        back: card.back,
        orderIndex: card.orderIndex,
        isDue,
        progress: prog,
      };
    });

    return NextResponse.json({
      deck: {
        id: deck.id,
        title: deck.title,
        description: deck.description,
        subject: deck.subject,
        author: deck.author,
        createdAt: deck.createdAt,
        cards,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const addCardsSchema = z.object({
  front: z.string().trim().min(1).max(1000).optional(),
  back: z.string().trim().min(1).max(2000).optional(),
  bulkText: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = addCardsSchema.parse(await req.json());

    const deck = await prisma.flashcardDeck.findUnique({
      where: { id },
      include: { _count: { select: { cards: true } } },
    });
    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
    if (user.role !== "ADMIN" && deck.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const toAdd: Array<{ front: string; back: string }> = [];
    if (body.front && body.back) {
      toAdd.push({ front: body.front, back: body.back });
    }
    if (body.bulkText) {
      toAdd.push(...parseBulkFlashcards(body.bulkText));
    }
    if (toAdd.length === 0) {
      return NextResponse.json({ error: "No valid cards provided" }, { status: 400 });
    }

    const startIndex = deck._count.cards;
    await prisma.flashcard.createMany({
      data: toAdd.map((c, idx) => ({
        deckId: deck.id,
        front: c.front,
        back: c.back,
        orderIndex: startIndex + idx,
      })),
    });

    return NextResponse.json({ addedCount: toAdd.length }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const deck = await prisma.flashcardDeck.findUnique({ where: { id } });
    if (!deck) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (user.role !== "ADMIN" && deck.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.flashcardDeck.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}


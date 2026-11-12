"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Plus, RotateCw } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import type { Sm2Rating } from "@/lib/sm2";

interface CardItem {
  id: string;
  front: string;
  back: string;
  isDue: boolean;
}

interface DeckDetail {
  id: string;
  title: string;
  description: string | null;
  subject: { nameUz: string; nameTk: string; color: string };
  author: { id: string; firstName: string };
  cards: CardItem[];
}

export default function FlashcardStudyPage() {
  const { id } = useParams<{ id: string }>();
  const { user, lang, t } = useApp();

  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [queue, setQueue] = useState<CardItem[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [practiceAll, setPracticeAll] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [newBulk, setNewBulk] = useState("");

  const loadDeck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/flashcards/decks/${id}`);
      if (!res.ok) {
        setDeck(null);
        return;
      }
      const data = await res.json();
      setDeck(data.deck);
      const due = (data.deck.cards as CardItem[]).filter((c) => c.isDue);
      setQueue(due);
      setFlipped(false);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  async function handleRate(rating: Sm2Rating) {
    const current = queue[0];
    if (!current) return;

    await fetch("/api/flashcards/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: current.id, rating }),
    });

    setReviewedCount((c) => c + 1);
    setFlipped(false);

    if (rating === "AGAIN") {
      // Re-queue card at the end of current session
      setQueue((prev) => [...prev.slice(1), current]);
    } else {
      setQueue((prev) => prev.slice(1));
    }
  }

  async function handleAddCards(e: React.FormEvent) {
    e.preventDefault();
    if (!newBulk.trim()) return;
    const res = await fetch(`/api/flashcards/decks/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulkText: newBulk }),
    });
    if (res.ok) {
      setNewBulk("");
      setShowAdd(false);
      await loadDeck();
    }
  }

  if (loading) {
    return <div className="h-64 rounded-2xl bg-muted animate-pulse" />;
  }

  if (!deck) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">{t.common.noResults}</p>
      </div>
    );
  }

  const canManage = user?.role === "ADMIN" || user?.id === deck.author.id;
  const activeCard = queue[0];

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/flashcards"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.common.back}
        </Link>

        {canManage && (
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-medium hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.common.create}
          </button>
        )}
      </div>

      <div className="space-y-1">
        <span
          className="text-xs px-2.5 py-0.5 rounded-full text-white font-medium"
          style={{ backgroundColor: deck.subject.color }}
        >
          {lang === "tk" ? deck.subject.nameTk : deck.subject.nameUz}
        </span>
        <h1 className="text-2xl font-bold">{deck.title}</h1>
        <p className="text-xs text-muted-foreground">
          {queue.length} {t.flashcards.dueCount} · {reviewedCount}{" "}
          {t.flashcards.cardsReviewed}
        </p>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAddCards}
          className="rounded-2xl border bg-card p-4 space-y-2.5"
        >
          <label className="text-xs font-medium block">
            {t.flashcards.bulkImportLabel}
          </label>
          <textarea
            rows={4}
            value={newBulk}
            onChange={(e) => setNewBulk(e.target.value)}
            placeholder={t.flashcards.bulkImportHint}
            className="w-full px-3 py-2 rounded-xl border bg-background text-xs font-mono"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 rounded-xl border text-xs"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium"
            >
              {t.common.save}
            </button>
          </div>
        </form>
      )}

      {!activeCard ? (
        <div className="rounded-2xl border bg-card p-10 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <div className="space-y-1">
            <h2 className="text-lg font-bold">{t.flashcards.sessionDone}</h2>
            <p className="text-sm text-muted-foreground">
              {t.flashcards.allCaughtUp}
            </p>
          </div>
          {!practiceAll && deck.cards.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPracticeAll(true);
                setQueue(deck.cards);
                setFlipped(false);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium hover:bg-accent"
            >
              <RotateCw className="h-4 w-4" />
              {t.flashcards.studyNow} ({deck.cards.length})
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div
            onClick={() => setFlipped((f) => !f)}
            className="min-h-[260px] rounded-2xl border bg-card p-8 flex flex-col items-center justify-center text-center cursor-pointer select-none shadow-sm hover:border-primary/40 transition-colors"
          >
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
              {flipped ? t.flashcards.back : t.flashcards.front}
            </span>
            <p className="text-xl sm:text-2xl font-semibold whitespace-pre-wrap">
              {flipped ? activeCard.back : activeCard.front}
            </p>
            {!flipped && (
              <span className="text-xs text-muted-foreground mt-6">
                {t.flashcards.tapToFlip}
              </span>
            )}
          </div>

          {flipped && (
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleRate("AGAIN")}
                className="py-3 px-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold text-xs sm:text-sm hover:bg-rose-500/25"
              >
                {t.flashcards.ratings.AGAIN}
              </button>
              <button
                type="button"
                onClick={() => handleRate("HARD")}
                className="py-3 px-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-xs sm:text-sm hover:bg-amber-500/25"
              >
                {t.flashcards.ratings.HARD}
              </button>
              <button
                type="button"
                onClick={() => handleRate("GOOD")}
                className="py-3 px-2 rounded-xl bg-primary/15 text-primary font-semibold text-xs sm:text-sm hover:bg-primary/25"
              >
                {t.flashcards.ratings.GOOD}
              </button>
              <button
                type="button"
                onClick={() => handleRate("EASY")}
                className="py-3 px-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-xs sm:text-sm hover:bg-emerald-500/25"
              >
                {t.flashcards.ratings.EASY}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


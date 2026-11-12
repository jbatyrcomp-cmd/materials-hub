"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Plus, Trash2, X } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  nameUz: string;
  nameTk: string;
  color: string;
}

interface DeckItem {
  id: string;
  title: string;
  description: string | null;
  totalCards: number;
  dueCards: number;
  subject: Subject;
  author: { id: string; firstName: string; lastName: string | null };
}

export default function FlashcardsPage() {
  const { user, lang, t } = useApp();
  const [decks, setDecks] = useState<DeckItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [cards, setCards] = useState([{ front: "", back: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [decksRes, subjRes] = await Promise.all([
        fetch("/api/flashcards/decks"),
        fetch("/api/subjects"),
      ]);
      const decksData = await decksRes.json();
      const subjData = await subjRes.json();
      setDecks(decksData.decks ?? []);
      const subList = subjData.subjects ?? [];
      setSubjects(subList);
      if (subList.length > 0 && !subjectId) {
        setSubjectId(subList[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreateDeck(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const validCards = cards.filter(
        (c) => c.front.trim() && c.back.trim()
      );
      const res = await fetch("/api/flashcards/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          subjectId,
          cards: validCards,
          bulkText: bulkText || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create deck");
        return;
      }
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setBulkText("");
      setCards([{ front: "", back: "" }]);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDeck(id: string) {
    if (!window.confirm(t.common.confirmDelete)) return;
    const res = await fetch(`/api/flashcards/decks/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setDecks((prev) => prev.filter((d) => d.id !== id));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t.flashcards.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t.flashcards.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t.flashcards.newDeck}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center space-y-2">
          <Layers className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t.common.noResults}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="rounded-2xl border bg-card p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-white font-medium"
                    style={{ backgroundColor: deck.subject.color }}
                  >
                    {lang === "tk"
                      ? deck.subject.nameTk
                      : deck.subject.nameUz}
                  </span>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full font-semibold",
                      deck.dueCards > 0
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {deck.dueCards} {t.flashcards.dueCount}
                  </span>
                </div>

                <h3 className="font-bold text-lg">{deck.title}</h3>
                {deck.description && (
                  <p className="text-xs text-muted-foreground">
                    {deck.description}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  {deck.totalCards} {t.flashcards.cardsCount} ·{" "}
                  {deck.author.firstName}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t">
                <Link
                  href={`/flashcards/${deck.id}`}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
                >
                  {t.flashcards.studyNow}
                </Link>

                {(user?.role === "ADMIN" || user?.id === deck.author.id) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteDeck(deck.id)}
                    className="p-2 rounded-xl border text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{t.flashcards.newDeck}</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateDeck} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">
                    {t.materials.form.title} *
                  </label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">
                    {t.materials.form.subject} *
                  </label>
                  <select
                    required
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {lang === "tk" ? s.nameTk : s.nameUz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">
                  {t.materials.form.description}
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                />
              </div>

              <div className="space-y-2 border-t pt-3">
                {cards.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2">
                    <input
                      value={c.front}
                      onChange={(e) =>
                        setCards((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, front: e.target.value } : item
                          )
                        )
                      }
                      placeholder={t.flashcards.front}
                      className="px-3 py-2 rounded-xl border bg-background text-xs"
                    />
                    <input
                      value={c.back}
                      onChange={(e) =>
                        setCards((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, back: e.target.value } : item
                          )
                        )
                      }
                      placeholder={t.flashcards.back}
                      className="px-3 py-2 rounded-xl border bg-background text-xs"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setCards((prev) => [...prev, { front: "", back: "" }])
                  }
                  className="text-xs text-primary font-medium hover:underline"
                >
                  + {t.flashcards.front} / {t.flashcards.back}
                </button>
              </div>

              <div className="border-t pt-3">
                <label className="text-xs font-medium block mb-1">
                  {t.flashcards.bulkImportLabel}
                </label>
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={t.flashcards.bulkImportHint}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-xl border text-sm"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                >
                  {saving ? t.common.saving : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Plus,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  nameUz: string;
  nameTk: string;
  color: string;
}

interface TestSummary {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  isPublished: boolean;
  subject: Subject;
  _count: { questions: number; attempts: number };
  myAttempt: {
    submittedAt: string | null;
    score: number;
    maxScore: number;
  } | null;
}

interface DraftQuestion {
  type: "SINGLE" | "MULTI";
  prompt: string;
  points: number;
  explanation: string;
  options: Array<{ id: string; text: string }>;
  correctOptionIds: string[];
}

export default function TestsPage() {
  const { user, lang, t } = useApp();
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);

  // Builder state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [isPublished, setIsPublished] = useState(true);
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    {
      type: "SINGLE",
      prompt: "",
      points: 1,
      explanation: "",
      options: [
        { id: "a", text: "" },
        { id: "b", text: "" },
        { id: "c", text: "" },
      ],
      correctOptionIds: ["a"],
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [testsRes, subjRes] = await Promise.all([
        fetch("/api/tests"),
        fetch("/api/subjects"),
      ]);
      const testsData = await testsRes.json();
      const subjData = await subjRes.json();
      setTests(testsData.tests ?? []);
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

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        type: "SINGLE",
        prompt: "",
        points: 1,
        explanation: "",
        options: [
          { id: "a", text: "" },
          { id: "b", text: "" },
          { id: "c", text: "" },
        ],
        correctOptionIds: ["a"],
      },
    ]);
  }

  function toggleCorrectOption(qIdx: number, optId: string) {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIdx) return q;
        if (q.type === "SINGLE") {
          return { ...q, correctOptionIds: [optId] };
        }
        const exists = q.correctOptionIds.includes(optId);
        const next = exists
          ? q.correctOptionIds.filter((x) => x !== optId)
          : [...q.correctOptionIds, optId];
        return { ...q, correctOptionIds: next.length > 0 ? next : [optId] };
      })
    );
  }

  function addOptionToQuestion(qIdx: number) {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIdx) return q;
        const nextId = String.fromCharCode(97 + q.options.length);
        return {
          ...q,
          options: [...q.options, { id: nextId, text: "" }],
        };
      })
    );
  }

  async function handleCreateTest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          subjectId,
          durationMinutes: Number(durationMinutes),
          shuffleQuestions,
          isPublished,
          questions: questions.map((q) => ({
            type: q.type,
            prompt: q.prompt,
            points: Number(q.points) || 1,
            explanation: q.explanation || undefined,
            options: q.options.filter((o) => o.text.trim().length > 0),
            correctOptionIds: q.correctOptionIds,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error creating test");
        return;
      }
      setShowBuilder(false);
      setTitle("");
      setDescription("");
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(test: TestSummary) {
    const res = await fetch(`/api/tests/${test.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !test.isPublished }),
    });
    if (res.ok) {
      setTests((prev) =>
        prev.map((item) =>
          item.id === test.id
            ? { ...item, isPublished: !item.isPublished }
            : item
        )
      );
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t.common.confirmDelete)) return;
    const res = await fetch(`/api/tests/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTests((prev) => prev.filter((item) => item.id !== id));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.tests.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t.tests.subtitle}
          </p>
        </div>

        {user?.role === "ADMIN" && (
          <button
            type="button"
            onClick={() => setShowBuilder(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t.tests.createTest}
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center space-y-2">
          <Timer className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t.common.noResults}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map((test) => {
            const attempted = Boolean(test.myAttempt?.submittedAt);
            const inProgress = Boolean(
              test.myAttempt && !test.myAttempt.submittedAt
            );
            return (
              <div
                key={test.id}
                className="rounded-2xl border bg-card p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: test.subject.color }}
                    >
                      {lang === "tk"
                        ? test.subject.nameTk
                        : test.subject.nameUz}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {user?.role === "ADMIN" && (
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md font-semibold",
                            test.isPublished
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {test.isPublished
                            ? t.tests.published
                            : t.tests.unpublished}
                        </span>
                      )}
                      {attempted && (
                        <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {t.tests.alreadyAttempted}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-lg">{test.title}</h3>
                  {test.description && (
                    <p className="text-xs text-muted-foreground">
                      {test.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                    <span>
                      ⏱ {test.durationMinutes} {t.tests.minutes}
                    </span>
                    <span>
                      ❓ {test._count.questions} {t.tests.questionsCount}
                    </span>
                    {attempted && test.myAttempt && (
                      <span className="font-semibold text-foreground">
                        🎯 {test.myAttempt.score}/{test.myAttempt.maxScore}{" "}
                        {t.tests.points}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t">
                  <Link
                    href={`/tests/${test.id}`}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-opacity",
                      attempted
                        ? "border bg-secondary hover:bg-accent"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    )}
                  >
                    {attempted
                      ? t.tests.reviewAnswers
                      : inProgress
                        ? t.tests.resumeTest
                        : t.tests.startTest}
                  </Link>

                  {user?.role === "ADMIN" && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => togglePublish(test)}
                        className="p-2 rounded-xl border hover:bg-accent text-muted-foreground"
                        title={
                          test.isPublished
                            ? t.tests.unpublished
                            : t.tests.published
                        }
                      >
                        {test.isPublished ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(test.id)}
                        className="p-2 rounded-xl border text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Test Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{t.tests.createTest}</h2>
              <button
                type="button"
                onClick={() => setShowBuilder(false)}
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

            <form onSubmit={handleCreateTest} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">
                    {t.tests.builder.testTitle} *
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
                    {t.tests.builder.subject} *
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <label className="text-xs font-medium block mb-1">
                    {t.tests.builder.duration} *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-medium pt-4">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                  />
                  {t.tests.builder.shuffle}
                </label>
                <label className="flex items-center gap-2 text-xs font-medium pt-4">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                  />
                  {t.tests.builder.publishNow}
                </label>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">
                  {t.tests.builder.testDesc}
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                />
              </div>

              {/* Questions */}
              <div className="space-y-3 border-t pt-3">
                {questions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className="p-4 rounded-xl border bg-muted/20 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold">
                        #{qIdx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={q.type}
                          onChange={(e) =>
                            setQuestions((prev) =>
                              prev.map((item, idx) =>
                                idx === qIdx
                                  ? {
                                      ...item,
                                      type: e.target.value as
                                        | "SINGLE"
                                        | "MULTI",
                                      correctOptionIds: [
                                        item.correctOptionIds[0] || "a",
                                      ],
                                    }
                                  : item
                              )
                            )
                          }
                          className="px-2 py-1 rounded-lg border bg-background text-xs"
                        >
                          <option value="SINGLE">{t.tests.singleChoice}</option>
                          <option value="MULTI">{t.tests.multiChoice}</option>
                        </select>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={q.points}
                          onChange={(e) =>
                            setQuestions((prev) =>
                              prev.map((item, idx) =>
                                idx === qIdx
                                  ? { ...item, points: Number(e.target.value) }
                                  : item
                              )
                            )
                          }
                          className="w-16 px-2 py-1 rounded-lg border bg-background text-xs"
                          title={t.tests.points}
                        />
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setQuestions((prev) =>
                                prev.filter((_, idx) => idx !== qIdx)
                              )
                            }
                            className="text-destructive p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      required
                      value={q.prompt}
                      onChange={(e) =>
                        setQuestions((prev) =>
                          prev.map((item, idx) =>
                            idx === qIdx
                              ? { ...item, prompt: e.target.value }
                              : item
                          )
                        )
                      }
                      placeholder={t.tests.builder.questionPrompt}
                      className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                    />

                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const checked = q.correctOptionIds.includes(opt.id);
                        return (
                          <div key={opt.id} className="flex items-center gap-2">
                            <input
                              type={q.type === "SINGLE" ? "radio" : "checkbox"}
                              name={`correct-${qIdx}`}
                              checked={checked}
                              onChange={() =>
                                toggleCorrectOption(qIdx, opt.id)
                              }
                              title={t.tests.builder.markCorrect}
                            />
                            <input
                              required={optIdx < 2}
                              value={opt.text}
                              onChange={(e) =>
                                setQuestions((prev) =>
                                  prev.map((item, idx) =>
                                    idx === qIdx
                                      ? {
                                          ...item,
                                          options: item.options.map((o) =>
                                            o.id === opt.id
                                              ? { ...o, text: e.target.value }
                                              : o
                                          ),
                                        }
                                      : item
                                  )
                                )
                              }
                              placeholder={`${t.tests.builder.optionText} ${opt.id.toUpperCase()}`}
                              className="flex-1 px-3 py-1.5 rounded-xl border bg-background text-xs"
                            />
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => addOptionToQuestion(qIdx)}
                        className="text-xs text-primary hover:underline"
                      >
                        + {t.tests.builder.addOption}
                      </button>
                    </div>

                    <input
                      value={q.explanation}
                      onChange={(e) =>
                        setQuestions((prev) =>
                          prev.map((item, idx) =>
                            idx === qIdx
                              ? { ...item, explanation: e.target.value }
                              : item
                          )
                        )
                      }
                      placeholder={t.tests.builder.explanation}
                      className="w-full px-3 py-1.5 rounded-xl border bg-background text-xs"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addQuestion}
                  className="w-full py-2 rounded-xl border border-dashed text-xs font-semibold hover:bg-accent"
                >
                  + {t.tests.builder.addQuestion}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBuilder(false)}
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


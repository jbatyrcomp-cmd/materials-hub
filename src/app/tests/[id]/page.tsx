"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Play,
  Trophy,
  XCircle,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { cn, formatDuration } from "@/lib/utils";

interface TestQuestionView {
  id: string;
  type: "SINGLE" | "MULTI";
  prompt: string;
  points: number;
  options: Array<{ id: string; text: string }>;
  correctOptionIds?: string[];
  explanation?: string | null;
}

interface TestDetail {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  subject: { nameUz: string; nameTk: string; color: string };
  questions: TestQuestionView[];
}

interface AttemptView {
  id: string;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  score: number;
  maxScore: number;
  durationSeconds: number;
  answers: Record<string, string[]>;
  remainingSeconds: number;
}

export default function TestTakePage() {
  const { id } = useParams<{ id: string }>();
  const { lang, t } = useApp();

  const [test, setTest] = useState<TestDetail | null>(null);
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;

  const loadTest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tests/${id}`);
      if (!res.ok) {
        setTest(null);
        return;
      }
      const data = await res.json();
      setTest(data.test);
      setAttempt(data.attempt);
      if (data.attempt) {
        setAnswers(data.attempt.answers ?? {});
        setSecondsLeft(data.attempt.remainingSeconds ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTest();
  }, [loadTest]);

  const submitAttempt = useCallback(
    async (skipConfirm = false) => {
      if (!skipConfirm && !window.confirm(t.tests.confirmSubmit)) return;
      if (submitting) return;
      setSubmitting(true);
      try {
        await fetch(`/api/tests/${id}/attempt`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: answersRef.current }),
        });
        await loadTest();
      } finally {
        setSubmitting(false);
      }
    },
    [id, loadTest, submitting, t.tests.confirmSubmit]
  );

  // Countdown timer when attempt is active
  useEffect(() => {
    if (!attempt || attempt.submittedAt) return;
    if (secondsLeft <= 0) {
      submitAttempt(true);
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt, secondsLeft, submitAttempt]);

  async function handleStart() {
    const res = await fetch(`/api/tests/${id}/attempt`, { method: "POST" });
    if (res.ok) {
      await loadTest();
    }
  }

  async function selectOption(
    questionId: string,
    optionId: string,
    type: "SINGLE" | "MULTI"
  ) {
    if (!attempt || attempt.submittedAt) return;

    const current = answers[questionId] ?? [];
    const nextForQuestion =
      type === "SINGLE"
        ? [optionId]
        : current.includes(optionId)
          ? current.filter((x) => x !== optionId)
          : [...current, optionId];

    const updated = { ...answers, [questionId]: nextForQuestion };
    setAnswers(updated);

    await fetch(`/api/tests/${id}/attempt`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: updated }),
    }).catch(() => null);
  }

  if (loading) {
    return <div className="h-64 rounded-2xl bg-muted animate-pulse" />;
  }

  if (!test) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">{t.common.noResults}</p>
      </div>
    );
  }

  const submitted = Boolean(attempt?.submittedAt);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <Link
        href="/tests"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.common.back}
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: test.subject.color }}
            >
              {lang === "tk" ? test.subject.nameTk : test.subject.nameUz}
            </span>
            <h1 className="text-2xl font-bold mt-2">{test.title}</h1>
            {test.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {test.description}
              </p>
            )}
          </div>

          {attempt && !submitted && (
            <div
              className={cn(
                "px-4 py-2 rounded-xl border font-mono text-lg font-bold flex items-center gap-2",
                secondsLeft < 60
                  ? "bg-destructive/10 border-destructive/40 text-destructive animate-pulse"
                  : "bg-primary/10 border-primary/30 text-primary"
              )}
            >
              <Clock className="h-5 w-5" />
              {formatDuration(secondsLeft)}
            </div>
          )}
        </div>

        {!attempt && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t">
            <div className="text-sm text-muted-foreground space-x-4">
              <span>
                ⏱ {test.durationMinutes} {t.tests.minutes}
              </span>
              <span>
                ❓ {test.questions.length} {t.tests.questionsCount}
              </span>
            </div>
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
            >
              <Play className="h-4 w-4" />
              {t.tests.startTest}
            </button>
          </div>
        )}

        {submitted && attempt && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {t.tests.yourScore}
                </p>
                <p className="text-xl font-bold">
                  {attempt.score} / {attempt.maxScore} {t.tests.points}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {t.tests.timeSpent}:{" "}
              <strong className="text-foreground">
                {attempt.durationSeconds} {t.tests.seconds}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Questions */}
      {attempt && (
        <div className="space-y-4">
          {test.questions.map((q, idx) => {
            const selected = answers[q.id] ?? [];
            const expected = q.correctOptionIds ?? [];
            const isCorrect =
              submitted &&
              selected.length === expected.length &&
              [...selected]
                .sort()
                .every((val, i) => val === [...expected].sort()[i]);

            return (
              <div
                key={q.id}
                className={cn(
                  "rounded-2xl border bg-card p-5 space-y-3",
                  submitted &&
                    (isCorrect
                      ? "border-emerald-500/40"
                      : "border-destructive/40")
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-base">
                    {idx + 1}. {q.prompt}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-secondary font-medium shrink-0">
                    {q.points} {t.tests.points}
                  </span>
                </div>

                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const isPicked = selected.includes(opt.id);
                    const isRightOption = expected.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={submitted}
                        onClick={() => selectOption(q.id, opt.id, q.type)}
                        className={cn(
                          "w-full text-left px-4 py-2.5 rounded-xl border text-sm flex items-center justify-between gap-2 transition-colors",
                          !submitted && isPicked && "border-primary bg-primary/10 font-medium",
                          !submitted && !isPicked && "hover:bg-accent",
                          submitted &&
                            isRightOption &&
                            "border-emerald-500 bg-emerald-500/10 font-medium",
                          submitted &&
                            isPicked &&
                            !isRightOption &&
                            "border-destructive bg-destructive/10"
                        )}
                      >
                        <span>{opt.text}</span>
                        {submitted && isRightOption && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        )}
                        {submitted && isPicked && !isRightOption && (
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {submitted && q.explanation && (
                  <p className="text-xs text-muted-foreground bg-muted/60 p-3 rounded-xl">
                    💡 {q.explanation}
                  </p>
                )}
              </div>
            );
          })}

          {!submitted && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitAttempt(false)}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? t.common.saving : t.tests.submitTest}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Eye,
  FileText,
  Heart,
  Layers,
  Plus,
  Timer,
  TrendingUp,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { cn } from "@/lib/utils";

interface DashboardData {
  stats: {
    totalMaterials: number;
    upcomingDeadlines: number;
    dueFlashcards: number;
    publishedTestsCount: number;
  };
  recentMaterials: Array<{
    id: string;
    type: string;
    title: string;
    viewsCount: number;
    createdAt: string;
    subject: { nameUz: string; nameTk: string; color: string };
    author: { firstName: string; lastName: string | null };
    _count: { likes: number; comments: number };
  }>;
  popularMaterials: Array<{
    id: string;
    type: string;
    title: string;
    viewsCount: number;
    subject: { nameUz: string; nameTk: string; color: string };
    _count: { likes: number; comments: number };
  }>;
  upcomingTasks: Array<{
    id: string;
    title: string;
    kind: string;
    dueAt: string;
    isCompleted: boolean;
    subject: { nameUz: string; nameTk: string; color: string };
  }>;
}

export default function HomePage() {
  const { user, lang, t } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t.dashboard.welcome}, {user?.firstName}!
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t.common.appSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/materials?new=1"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            {t.dashboard.addMaterial}
          </Link>
          <Link
            href="/flashcards"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border bg-card text-sm font-medium hover:bg-accent transition-colors"
          >
            <Layers className="h-4 w-4 text-emerald-500" />
            {t.dashboard.practiceCards}
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          href="/materials"
          className="p-4 rounded-2xl border bg-card hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t.dashboard.totalMaterials}
            </span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold mt-2">{data.stats.totalMaterials}</p>
        </Link>

        <Link
          href="/calendar"
          className="p-4 rounded-2xl border bg-card hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t.dashboard.upcomingDeadlines}
            </span>
            <CalendarClock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {data.stats.upcomingDeadlines}
          </p>
        </Link>

        <Link
          href="/flashcards"
          className="p-4 rounded-2xl border bg-card hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t.dashboard.dueFlashcards}
            </span>
            <Layers className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{data.stats.dueFlashcards}</p>
        </Link>

        <Link
          href="/tests"
          className="p-4 rounded-2xl border bg-card hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t.dashboard.takeTest}
            </span>
            <Timer className="h-4 w-4 text-violet-500" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {data.stats.publishedTestsCount}
          </p>
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Materials */}
        <section className="lg:col-span-2 rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base">
              {t.dashboard.recentMaterials}
            </h2>
            <Link
              href="/materials"
              className="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
            >
              {t.common.all} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.recentMaterials.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t.common.noResults}
            </p>
          ) : (
            <div className="divide-y">
              {data.recentMaterials.map((m) => (
                <Link
                  key={m.id}
                  href={`/materials/${m.id}`}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-muted/40 -mx-2 px-2 rounded-xl transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: m.subject.color }}
                      />
                      <span className="text-xs text-muted-foreground truncate">
                        {lang === "tk" ? m.subject.nameTk : m.subject.nameUz}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium">
                        {t.materials.types[
                          m.type as keyof typeof t.materials.types
                        ] ?? m.type}
                      </span>
                    </div>
                    <p className="font-medium text-sm truncate mt-1">
                      {m.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.author.firstName} {m.author.lastName ?? ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {m.viewsCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" /> {m._count.likes}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Deadlines + Popular */}
        <div className="space-y-5">
          <section className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base">
                {t.dashboard.upcomingDeadlines}
              </h2>
              <Link
                href="/calendar"
                className="text-xs font-medium text-primary hover:underline"
              >
                {t.common.all}
              </Link>
            </div>

            {data.upcomingTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3">
                {t.common.noResults}
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.upcomingTasks.map((task) => (
                  <Link
                    key={task.id}
                    href="/calendar"
                    className={cn(
                      "block p-3 rounded-xl border text-sm transition-colors hover:bg-muted/40",
                      task.isCompleted && "opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-secondary">
                        {t.calendar.kinds[
                          task.kind as keyof typeof t.calendar.kinds
                        ] ?? task.kind}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(task.dueAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "font-medium mt-1.5 text-sm",
                        task.isCompleted && "line-through"
                      )}
                    >
                      {task.title}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-base">
                {t.dashboard.popularMaterials}
              </h2>
            </div>
            <div className="space-y-2">
              {data.popularMaterials.map((m) => (
                <Link
                  key={m.id}
                  href={`/materials/${m.id}`}
                  className="flex items-center justify-between gap-2 text-sm py-1.5 hover:text-primary transition-colors"
                >
                  <span className="truncate">{m.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {m.viewsCount}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


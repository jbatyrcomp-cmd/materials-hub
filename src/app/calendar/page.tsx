"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  ExternalLink,
  Plus,
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

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  kind: "HOMEWORK" | "EXAM" | "EVENT";
  dueAt: string;
  isCompleted: boolean;
  subject: Subject;
  linkedMaterial: { id: string; title: string; type: string } | null;
}

export default function CalendarPage() {
  const { user, lang, t } = useApp();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [kind, setKind] = useState<"HOMEWORK" | "EXAM" | "EVENT">("HOMEWORK");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, subjRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/subjects"),
      ]);
      const tasksData = await tasksRes.json();
      const subjData = await subjRes.json();
      setTasks(tasksData.tasks ?? []);
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

  async function handleToggle(id: string) {
    const res = await fetch(`/api/tasks/${id}/toggle`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setTasks((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isCompleted: data.isCompleted } : item
      )
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!dueAt) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          subjectId,
          kind,
          dueAt: new Date(dueAt).toISOString(),
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setTitle("");
        setDescription("");
        setDueAt("");
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t.common.confirmDelete)) return;
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTasks((prev) => prev.filter((item) => item.id !== id));
    }
  }

  const now = Date.now();

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t.calendar.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t.calendar.subtitle}
          </p>
        </div>

        {user?.role === "ADMIN" && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t.calendar.addTask}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center space-y-2">
          <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t.common.noResults}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const dueMs = new Date(task.dueAt).getTime();
            const isOverdue = !task.isCompleted && dueMs < now;
            return (
              <div
                key={task.id}
                className={cn(
                  "rounded-2xl border bg-card p-4 flex items-start justify-between gap-3 transition-colors",
                  task.isCompleted && "opacity-65",
                  isOverdue && "border-destructive/40"
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(task.id)}
                    title={
                      task.isCompleted
                        ? t.calendar.markUndone
                        : t.calendar.markDone
                    }
                    className="mt-0.5 text-muted-foreground hover:text-primary shrink-0"
                  >
                    {task.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className="px-2 py-0.5 rounded-full text-white font-medium"
                        style={{ backgroundColor: task.subject.color }}
                      >
                        {lang === "tk"
                          ? task.subject.nameTk
                          : task.subject.nameUz}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-secondary font-medium">
                        {t.calendar.kinds[task.kind]}
                      </span>
                      {isOverdue && (
                        <span className="px-2 py-0.5 rounded-md bg-destructive/15 text-destructive font-semibold">
                          {t.calendar.overdue}
                        </span>
                      )}
                    </div>

                    <h3
                      className={cn(
                        "font-semibold text-base",
                        task.isCompleted && "line-through"
                      )}
                    >
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                      <span>
                        📅 {new Date(task.dueAt).toLocaleString()}
                      </span>
                      {task.linkedMaterial && (
                        <Link
                          href={`/materials/${task.linkedMaterial.id}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {task.linkedMaterial.title}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {user?.role === "ADMIN" && (
                  <button
                    type="button"
                    onClick={() => handleDelete(task.id)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{t.calendar.addTask}</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
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

              <div className="grid grid-cols-2 gap-3">
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

                <div>
                  <label className="text-xs font-medium block mb-1">
                    {t.materials.filterByType}
                  </label>
                  <select
                    value={kind}
                    onChange={(e) =>
                      setKind(e.target.value as "HOMEWORK" | "EXAM" | "EVENT")
                    }
                    className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                  >
                    <option value="HOMEWORK">{t.calendar.kinds.HOMEWORK}</option>
                    <option value="EXAM">{t.calendar.kinds.EXAM}</option>
                    <option value="EVENT">{t.calendar.kinds.EVENT}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">
                  {t.calendar.dueDate} *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">
                  {t.materials.form.description}
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
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


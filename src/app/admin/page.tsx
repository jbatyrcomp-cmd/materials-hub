"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  FolderPlus,
  Plus,
  Shield,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  nameUz: string;
  nameTk: string;
  color: string;
  folders: Array<{ id: string; name: string }>;
  _count: { materials: number };
}

interface MemberItem {
  id: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "MEMBER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  _count: { materials: number; testAttempts: number };
}

export default function AdminPage() {
  const { user, lang, t } = useApp();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [nameUz, setNameUz] = useState("");
  const [nameTk, setNameTk] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const [folderSubjectId, setFolderSubjectId] = useState("");
  const [folderName, setFolderName] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subjRes, usersRes] = await Promise.all([
        fetch("/api/subjects"),
        fetch("/api/users"),
      ]);
      const subjData = await subjRes.json();
      const usersData = await usersRes.json();
      const subList = subjData.subjects ?? [];
      setSubjects(subList);
      setMembers(usersData.users ?? []);
      if (subList.length > 0 && !folderSubjectId) {
        setFolderSubjectId(subList[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [folderSubjectId]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      loadData();
    }
  }, [user, loadData]);

  if (user?.role !== "ADMIN") {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <Shield className="h-8 w-8 mx-auto text-destructive mb-2" />
        <p className="text-sm font-medium">Admin only</p>
      </div>
    );
  }

  async function handleAddSubject(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameUz, nameTk, color }),
    });
    if (res.ok) {
      setNameUz("");
      setNameTk("");
      await loadData();
    }
  }

  async function handleDeleteSubject(id: string) {
    if (!window.confirm(t.common.confirmDelete)) return;
    const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
    if (res.ok) await loadData();
  }

  async function handleAddFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!folderSubjectId || !folderName.trim()) return;
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: folderSubjectId,
        name: folderName.trim(),
      }),
    });
    if (res.ok) {
      setFolderName("");
      await loadData();
    }
  }

  async function handleDeleteFolder(id: string) {
    if (!window.confirm(t.common.confirmDelete)) return;
    const res = await fetch(`/api/folders/${id}`, { method: "DELETE" });
    if (res.ok) await loadData();
  }

  async function updateMember(
    id: string,
    payload: { status?: "APPROVED" | "REJECTED"; role?: "ADMIN" | "MEMBER" }
  ) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await loadData();
    }
  }

  const pendingMembers = members.filter((m) => m.status === "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.admin.title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t.admin.subtitle}
        </p>
      </div>

      {/* Pending Approvals Highlight */}
      {pendingMembers.length > 0 && (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 space-y-3">
          <h2 className="font-semibold text-base text-amber-700 dark:text-amber-400">
            {t.admin.pendingTitle} ({pendingMembers.length})
          </h2>
          <div className="divide-y">
            {pendingMembers.map((m) => (
              <div
                key={m.id}
                className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="font-semibold">
                  {m.firstName} {m.lastName}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateMember(m.id, { status: "APPROVED" })}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1 hover:opacity-90"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {t.admin.approve}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMember(m.id, { status: "REJECTED" })}
                    className="px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold inline-flex items-center gap-1 hover:opacity-90"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t.admin.reject}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Subjects Management */}
        <section className="rounded-2xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-base">{t.admin.subjectsTitle}</h2>

          <form onSubmit={handleAddSubject} className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                required
                value={nameUz}
                onChange={(e) => setNameUz(e.target.value)}
                placeholder={t.admin.nameUz}
                className="px-3 py-2 rounded-xl border bg-background text-sm"
              />
              <input
                required
                value={nameTk}
                onChange={(e) => setNameTk(e.target.value)}
                placeholder={t.admin.nameTk}
                className="px-3 py-2 rounded-xl border bg-background text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 rounded-lg border bg-background cursor-pointer"
                title={t.admin.color}
              />
              <button
                type="submit"
                className="flex-1 py-2 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                {t.admin.addSubject}
              </button>
            </div>
          </form>

          {!loading && (
            <div className="space-y-2">
              {subjects.map((s) => (
                <div key={s.id} className="p-3 rounded-xl border space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="font-semibold text-sm">
                        {lang === "tk" ? s.nameTk : s.nameUz}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({s._count.materials})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubject(s.id)}
                      className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {s.folders.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-5">
                      {s.folders.map((f) => (
                        <span
                          key={f.id}
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-muted"
                        >
                          📁 {f.name}
                          <button
                            type="button"
                            onClick={() => handleDeleteFolder(f.id)}
                            className="text-destructive ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Folders + Members */}
        <div className="space-y-5">
          <section className="rounded-2xl border bg-card p-5 space-y-3">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-primary" />
              {t.admin.foldersTitle}
            </h2>
            <form
              onSubmit={handleAddFolder}
              className="flex flex-col sm:flex-row gap-2"
            >
              <select
                value={folderSubjectId}
                onChange={(e) => setFolderSubjectId(e.target.value)}
                className="px-3 py-2 rounded-xl border bg-background text-sm"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {lang === "tk" ? s.nameTk : s.nameUz}
                  </option>
                ))}
              </select>
              <input
                required
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder={t.admin.folderName}
                className="flex-1 px-3 py-2 rounded-xl border bg-background text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-accent text-sm font-medium"
              >
                {t.admin.addFolder}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border bg-card p-5 space-y-3">
            <h2 className="font-semibold text-base">
              {t.admin.membersTitle} ({members.length})
            </h2>
            <div className="divide-y">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {m.firstName} {m.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      📄 {m._count.materials} · 📝 {m._count.testAttempts}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-md font-semibold",
                        m.status === "APPROVED"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : m.status === "PENDING"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-destructive/15 text-destructive"
                      )}
                    >
                      {m.status === "APPROVED"
                        ? t.admin.statusApproved
                        : m.status === "PENDING"
                          ? t.admin.statusPending
                          : t.admin.statusRejected}
                    </span>

                    <span className="px-2 py-0.5 rounded-md bg-secondary font-semibold">
                      {m.role}
                    </span>

                    {m.id !== user.id && (
                      <>
                        {m.status !== "APPROVED" && (
                          <button
                            type="button"
                            onClick={() =>
                              updateMember(m.id, { status: "APPROVED" })
                            }
                            className="p-1.5 rounded-lg border text-emerald-600 hover:bg-emerald-500/10"
                            title={t.admin.approve}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {m.status !== "REJECTED" && (
                          <button
                            type="button"
                            onClick={() =>
                              updateMember(m.id, { status: "REJECTED" })
                            }
                            className="p-1.5 rounded-lg border text-destructive hover:bg-destructive/10"
                            title={t.admin.reject}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {m.status === "APPROVED" && (
                          <button
                            type="button"
                            onClick={() =>
                              updateMember(m.id, {
                                role: m.role === "ADMIN" ? "MEMBER" : "ADMIN",
                              })
                            }
                            className="p-1.5 rounded-lg border hover:bg-accent"
                            title={
                              m.role === "ADMIN"
                                ? t.admin.makeMember
                                : t.admin.makeAdmin
                            }
                          >
                            <UserCog className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

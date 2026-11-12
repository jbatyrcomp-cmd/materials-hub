"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Bookmark,
  Eye,
  FileText,
  FileUp,
  Headphones,
  Heart,
  Link2,
  MessageSquare,
  Plus,
  Search,
  StickyNote,
  Video,
  X,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { cn, formatBytes } from "@/lib/utils";
import { uploadFileSmart } from "@/lib/upload-client";

interface Subject {
  id: string;
  nameUz: string;
  nameTk: string;
  color: string;
  folders: Array<{ id: string; name: string }>;
}

interface MaterialItem {
  id: string;
  type: "FILE" | "NOTE" | "LINK" | "VIDEO_LINK" | "AUDIO_LINK";
  title: string;
  description: string | null;
  currentVersion: number;
  viewsCount: number;
  downloadsCount: number;
  createdAt: string;
  subject: { id: string; nameUz: string; nameTk: string; color: string };
  folder: { id: string; name: string } | null;
  author: { id: string; firstName: string; lastName: string | null };
  tags: string[];
  latestVersion: {
    fileName: string | null;
    fileSize: number | null;
  } | null;
  _count: { likes: number; comments: number };
  isLiked: boolean;
  isBookmarked: boolean;
}

const TYPE_ICONS = {
  FILE: FileUp,
  NOTE: StickyNote,
  LINK: Link2,
  VIDEO_LINK: Video,
  AUDIO_LINK: Headphones,
};

export function MaterialsBrowser({
  bookmarkedOnly = false,
}: {
  bookmarkedOnly?: boolean;
}) {
  const { lang, t } = useApp();
  const searchParams = useSearchParams();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [folderId, setFolderId] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sort, setSort] = useState<"newest" | "popular" | "liked">("newest");

  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [newType, setNewType] = useState<
    "FILE" | "NOTE" | "LINK" | "VIDEO_LINK" | "AUDIO_LINK"
  >("FILE");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newFolderId, setNewFolderId] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowCreate(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((data) => {
        const list = data.subjects ?? [];
        setSubjects(list);
        if (list.length > 0 && !newSubjectId) {
          setNewSubjectId(list[0].id);
        }
      });
  }, [newSubjectId]);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (subjectId) sp.set("subjectId", subjectId);
      if (folderId) sp.set("folderId", folderId);
      if (typeFilter) sp.set("type", typeFilter);
      if (tagFilter) sp.set("tag", tagFilter);
      if (bookmarkedOnly) sp.set("bookmarked", "1");
      sp.set("sort", sort);

      const res = await fetch(`/api/materials?${sp.toString()}`);
      const data = await res.json();
      setMaterials(data.materials ?? []);
    } finally {
      setLoading(false);
    }
  }, [q, subjectId, folderId, typeFilter, tagFilter, bookmarkedOnly, sort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMaterials();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadMaterials]);

  async function toggleLike(id: string) {
    const res = await fetch(`/api/materials/${id}/like`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              isLiked: data.liked,
              _count: { ...m._count, likes: data.count },
            }
          : m
      )
    );
  }

  async function toggleBookmark(id: string) {
    const res = await fetch(`/api/materials/${id}/bookmark`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setMaterials((prev) => {
      if (bookmarkedOnly && !data.bookmarked) {
        return prev.filter((m) => m.id !== id);
      }
      return prev.map((m) =>
        m.id === id ? { ...m, isBookmarked: data.bookmarked } : m
      );
    });
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      let res: Response;
      if (newType === "FILE") {
        if (!newFile) {
          setFormError("Please select a file");
          setSubmitting(false);
          return;
        }
        const uploaded = await uploadFileSmart(newFile);
        if (uploaded.mode === "s3") {
          res = await fetch("/api/materials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "FILE",
              title: newTitle,
              description: newDesc || undefined,
              subjectId: newSubjectId,
              folderId: newFolderId || null,
              tags: newTags,
              fileKey: uploaded.fileKey,
              fileName: uploaded.fileName,
              mimeType: uploaded.mimeType,
              fileSize: uploaded.fileSize,
            }),
          });
        } else {
          const fd = new FormData();
          fd.append("file", newFile);
          fd.append("title", newTitle);
          fd.append("description", newDesc);
          fd.append("subjectId", newSubjectId);
          if (newFolderId) fd.append("folderId", newFolderId);
          fd.append("tags", newTags);
          res = await fetch("/api/materials", { method: "POST", body: fd });
        }
      } else {
        res = await fetch("/api/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: newType,
            title: newTitle,
            description: newDesc || undefined,
            subjectId: newSubjectId,
            folderId: newFolderId || null,
            tags: newTags,
            externalUrl: newType !== "NOTE" ? newUrl : undefined,
            noteContent: newType === "NOTE" ? newNote : undefined,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Material yaratishda xatolik yuz berdi");
        return;
      }

      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
      setNewTags("");
      setNewUrl("");
      setNewNote("");
      setNewFile(null);
      await loadMaterials();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Material yuklashda xatolik yuz berdi"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const activeSubject = subjects.find((s) => s.id === subjectId);
  const modalSubject = subjects.find((s) => s.id === newSubjectId);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {bookmarkedOnly ? t.nav.bookmarks : t.materials.title}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          {t.materials.newMaterial}
        </button>
      </div>

      {/* Filters & Search */}
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.common.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border bg-background text-sm"
          >
            <option value="">{t.materials.filterByType}: {t.common.all}</option>
            {(["FILE", "NOTE", "LINK", "VIDEO_LINK", "AUDIO_LINK"] as const).map(
              (tp) => (
                <option key={tp} value={tp}>
                  {t.materials.types[tp]}
                </option>
              )
            )}
          </select>

          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as "newest" | "popular" | "liked")
            }
            className="px-3 py-2 rounded-xl border bg-background text-sm"
          >
            <option value="newest">{t.materials.sortNewest}</option>
            <option value="popular">{t.materials.sortPopular}</option>
            <option value="liked">{t.materials.sortLiked}</option>
          </select>
        </div>

        {/* Subject Pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSubjectId("");
              setFolderId("");
            }}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              !subjectId
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-accent"
            )}
          >
            {t.common.all}
          </button>
          {subjects.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => {
                setSubjectId(sub.id);
                setFolderId("");
              }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-colors",
                subjectId === sub.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-accent"
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: sub.color }}
              />
              {lang === "tk" ? sub.nameTk : sub.nameUz}
            </button>
          ))}
        </div>

        {activeSubject && activeSubject.folders.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t">
            <button
              type="button"
              onClick={() => setFolderId("")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs border",
                !folderId ? "bg-secondary font-semibold" : "text-muted-foreground"
              )}
            >
              {t.materials.form.noFolder}
            </button>
            {activeSubject.folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setFolderId(folder.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs border",
                  folderId === folder.id
                    ? "bg-secondary font-semibold"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                📁 {folder.name}
              </button>
            ))}
          </div>
        )}

        {tagFilter && (
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
              #{tagFilter}
              <button type="button" onClick={() => setTagFilter("")}>
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Materials List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center space-y-2">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t.common.noResults}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {materials.map((m) => {
            const Icon = TYPE_ICONS[m.type] ?? FileText;
            return (
              <div
                key={m.id}
                className="rounded-2xl border bg-card p-4 flex flex-col justify-between gap-3 hover:border-primary/40 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: m.subject.color }}
                      />
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        {lang === "tk" ? m.subject.nameTk : m.subject.nameUz}
                      </span>
                      {m.folder && (
                        <span className="text-xs text-muted-foreground truncate">
                          / {m.folder.name}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary flex items-center gap-1 shrink-0">
                      <Icon className="h-3 w-3" />
                      v{m.currentVersion}
                    </span>
                  </div>

                  <Link
                    href={`/materials/${m.id}`}
                    className="block font-semibold text-base hover:text-primary transition-colors line-clamp-2"
                  >
                    {m.title}
                  </Link>

                  {m.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {m.description}
                    </p>
                  )}

                  {m.latestVersion?.fileName && (
                    <p className="text-xs text-muted-foreground">
                      📎 {m.latestVersion.fileName} (
                      {formatBytes(m.latestVersion.fileSize)})
                    </p>
                  )}

                  {m.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {m.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setTagFilter(tag)}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-muted hover:bg-accent text-muted-foreground"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                  <span className="truncate">
                    {m.author.firstName} {m.author.lastName ?? ""}
                  </span>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {m.viewsCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />{" "}
                      {m._count.comments}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleLike(m.id)}
                      className={cn(
                        "flex items-center gap-1 hover:text-rose-500 transition-colors",
                        m.isLiked && "text-rose-500 font-semibold"
                      )}
                    >
                      <Heart
                        className={cn(
                          "h-3.5 w-3.5",
                          m.isLiked && "fill-current"
                        )}
                      />
                      {m._count.likes}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBookmark(m.id)}
                      className={cn(
                        "hover:text-primary transition-colors",
                        m.isBookmarked && "text-primary"
                      )}
                    >
                      <Bookmark
                        className={cn(
                          "h-3.5 w-3.5",
                          m.isBookmarked && "fill-current"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Material Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{t.materials.newMaterial}</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              {/* Type tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {(
                  ["FILE", "NOTE", "VIDEO_LINK", "AUDIO_LINK", "LINK"] as const
                ).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setNewType(tp)}
                    className={cn(
                      "px-2 py-2 rounded-xl text-xs font-medium border text-center transition-colors",
                      newType === tp
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    {t.materials.types[tp]}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">
                  {t.materials.form.title} *
                </label>
                <input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">
                    {t.materials.form.subject} *
                  </label>
                  <select
                    required
                    value={newSubjectId}
                    onChange={(e) => {
                      setNewSubjectId(e.target.value);
                      setNewFolderId("");
                    }}
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
                    {t.materials.form.folder}
                  </label>
                  <select
                    value={newFolderId}
                    onChange={(e) => setNewFolderId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                  >
                    <option value="">{t.materials.form.noFolder}</option>
                    {(modalSubject?.folders ?? []).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
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
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                />
              </div>

              {newType === "FILE" ? (
                <div>
                  <label className="text-xs font-medium block mb-1">
                    {t.materials.form.chooseFile} *
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-secondary file:text-xs file:font-semibold"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {t.materials.form.maxSizeHint}
                  </p>
                </div>
              ) : newType === "NOTE" ? (
                <div>
                  <label className="text-xs font-medium block mb-1">
                    {t.materials.form.noteContent} *
                  </label>
                  <textarea
                    required
                    rows={7}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={t.materials.form.noteHint}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-sm font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium block mb-1">
                    {t.materials.form.externalUrl} *
                  </label>
                  <input
                    type="url"
                    required
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium block mb-1">
                  {t.materials.form.tags}
                </label>
                <input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder={t.materials.form.tagsHint}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-accent"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? t.common.saving : t.materials.form.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


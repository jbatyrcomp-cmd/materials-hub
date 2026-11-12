"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Heart,
  History,
  MessageSquare,
  RotateCcw,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cn, formatBytes } from "@/lib/utils";
import { uploadFileSmart } from "@/lib/upload-client";

interface VersionItem {
  id: string;
  versionNumber: number;
  noteContent: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  changeSummary: string | null;
  createdAt: string;
  editor: { id: string; firstName: string; lastName: string | null };
}

interface CommentItem {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string | null;
    role: string;
  };
}

interface MaterialDetail {
  id: string;
  type: "FILE" | "NOTE" | "LINK" | "VIDEO_LINK" | "AUDIO_LINK";
  title: string;
  description: string | null;
  externalUrl: string | null;
  currentVersion: number;
  viewsCount: number;
  downloadsCount: number;
  createdAt: string;
  subject: { nameUz: string; nameTk: string; color: string };
  folder: { name: string } | null;
  author: { id: string; firstName: string; lastName: string | null };
  tags: string[];
  versions: VersionItem[];
  comments: CommentItem[];
  _count: { likes: number; comments: number };
  isLiked: boolean;
  isBookmarked: boolean;
  embedInfo: { provider: string; embedUrl: string | null } | null;
}

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, lang, t } = useApp();

  const [material, setMaterial] = useState<MaterialDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/materials/${id}`);
      if (!res.ok) {
        setMaterial(null);
        return;
      }
      const data = await res.json();
      setMaterial(data.material);
      if (data.material?.versions?.[0]) {
        setSelectedVersionId(data.material.versions[0].id);
        setNoteDraft(data.material.versions[0].noteContent ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  if (loading) {
    return <div className="h-64 rounded-2xl bg-muted animate-pulse" />;
  }

  if (!material) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center space-y-3">
        <p className="text-muted-foreground">{t.common.noResults}</p>
        <Link href="/materials" className="text-primary text-sm hover:underline">
          {t.common.back}
        </Link>
      </div>
    );
  }

  const canManage =
    user?.role === "ADMIN" || user?.id === material.author.id;
  const activeVersion =
    material.versions.find((v) => v.id === selectedVersionId) ??
    material.versions[0];

  const isPdf = activeVersion?.mimeType?.toLowerCase() === "application/pdf";
  const isImage = activeVersion?.mimeType?.toLowerCase().startsWith("image/");

  async function handleToggleLike() {
    if (!material) return;
    const res = await fetch(`/api/materials/${material.id}/like`, {
      method: "POST",
    });
    if (!res.ok) return;
    const data = await res.json();
    setMaterial((prev) =>
      prev
        ? {
            ...prev,
            isLiked: data.liked,
            _count: { ...prev._count, likes: data.count },
          }
        : null
    );
  }

  async function handleToggleBookmark() {
    if (!material) return;
    const res = await fetch(`/api/materials/${material.id}/bookmark`, {
      method: "POST",
    });
    if (!res.ok) return;
    const data = await res.json();
    setMaterial((prev) =>
      prev ? { ...prev, isBookmarked: data.bookmarked } : null
    );
  }

  async function handleSaveNoteVersion(e: React.FormEvent) {
    e.preventDefault();
    if (!material) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/materials/${material.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteContent: noteDraft,
          changeSummary: changeSummary || undefined,
        }),
      });
      if (res.ok) {
        setEditingNote(false);
        setChangeSummary("");
        await loadDetail();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadFileVersion(e: React.FormEvent) {
    e.preventDefault();
    if (!material || !newVersionFile) return;
    setSaving(true);
    try {
      const uploaded = await uploadFileSmart(
        newVersionFile,
        material.id,
        material.currentVersion + 1
      );
      let res: Response;
      if (uploaded.mode === "s3") {
        res = await fetch(`/api/materials/${material.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileKey: uploaded.fileKey,
            fileName: uploaded.fileName,
            mimeType: uploaded.mimeType,
            fileSize: uploaded.fileSize,
            changeSummary: changeSummary || undefined,
          }),
        });
      } else {
        const fd = new FormData();
        fd.append("file", newVersionFile);
        if (changeSummary) fd.append("changeSummary", changeSummary);
        res = await fetch(`/api/materials/${material.id}`, {
          method: "PATCH",
          body: fd,
        });
      }
      if (res.ok) {
        setNewVersionFile(null);
        setChangeSummary("");
        await loadDetail();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRestoreVersion(versionId: string) {
    if (!material) return;
    const res = await fetch(`/api/materials/${material.id}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId }),
    });
    if (res.ok) {
      await loadDetail();
    }
  }

  async function handleDeleteMaterial() {
    if (!material || !window.confirm(t.common.confirmDelete)) return;
    const res = await fetch(`/api/materials/${material.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/materials");
    }
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!material || !commentText.trim()) return;
    const res = await fetch(`/api/materials/${material.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: commentText.trim(),
        parentId: replyToId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setMaterial((prev) =>
        prev
          ? {
              ...prev,
              comments: [...prev.comments, data.comment],
              _count: {
                ...prev._count,
                comments: prev._count.comments + 1,
              },
            }
          : null
      );
      setCommentText("");
      setReplyToId(null);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!material) return;
    const res = await fetch(
      `/api/materials/${material.id}/comments?commentId=${encodeURIComponent(
        commentId
      )}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setMaterial((prev) =>
        prev
          ? {
              ...prev,
              comments: prev.comments.filter((c) => c.id !== commentId),
            }
          : null
      );
    }
  }

  const topComments = material.comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, CommentItem[]>();
  for (const c of material.comments) {
    if (c.parentId) {
      const list = repliesByParent.get(c.parentId) ?? [];
      list.push(c);
      repliesByParent.set(c.parentId, list);
    }
  }

  return (
    <div className="space-y-5">
      <Link
        href="/materials"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.common.back}
      </Link>

      {/* Main Card */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className="px-2.5 py-0.5 rounded-full font-medium text-white"
                style={{ backgroundColor: material.subject.color }}
              >
                {lang === "tk"
                  ? material.subject.nameTk
                  : material.subject.nameUz}
              </span>
              {material.folder && (
                <span className="text-muted-foreground">
                  📁 {material.folder.name}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md bg-secondary font-medium">
                {t.materials.types[material.type]} · v{material.currentVersion}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {material.title}
            </h1>
            {material.description && (
              <p className="text-sm text-muted-foreground">
                {material.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleLike}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors",
                material.isLiked
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  : "hover:bg-accent"
              )}
            >
              <Heart
                className={cn("h-4 w-4", material.isLiked && "fill-current")}
              />
              {material._count.likes}
            </button>

            <button
              type="button"
              onClick={handleToggleBookmark}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors",
                material.isBookmarked
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "hover:bg-accent"
              )}
            >
              <Bookmark
                className={cn(
                  "h-4 w-4",
                  material.isBookmarked && "fill-current"
                )}
              />
              {material.isBookmarked
                ? t.materials.detail.bookmarked
                : t.materials.detail.bookmark}
            </button>

            {canManage && (
              <button
                type="button"
                onClick={handleDeleteMaterial}
                className="p-2 rounded-xl border text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-y py-2.5">
          <span>
            {t.materials.detail.author}:{" "}
            <strong className="text-foreground">
              {material.author.firstName} {material.author.lastName ?? ""}
            </strong>
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {material.viewsCount}{" "}
            {t.materials.detail.views}
          </span>
          {material.type === "FILE" && (
            <span className="flex items-center gap-1">
              <Download className="h-3.5 w-3.5" /> {material.downloadsCount}{" "}
              {t.materials.detail.downloads}
            </span>
          )}
          <div className="flex flex-wrap gap-1">
            {material.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Content body by type */}
        {material.type === "FILE" && activeVersion && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-muted/50 border">
              <div>
                <p className="font-semibold text-sm">
                  {activeVersion.fileName} (v{activeVersion.versionNumber})
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(activeVersion.fileSize)} ·{" "}
                  {activeVersion.mimeType}
                </p>
              </div>
              <a
                href={`/api/materials/${material.id}/download?versionId=${activeVersion.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                <Download className="h-4 w-4" />
                {t.common.download}
              </a>
            </div>

            {isPdf && (
              <iframe
                src={`/api/materials/${material.id}/download?versionId=${activeVersion.id}&inline=1`}
                title={activeVersion.fileName ?? "PDF Preview"}
                className="w-full h-[540px] rounded-xl border bg-white"
              />
            )}

            {isImage && (
              <div className="rounded-xl border overflow-hidden bg-muted/30 flex justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/materials/${material.id}/download?versionId=${activeVersion.id}&inline=1`}
                  alt={material.title}
                  className="max-h-[540px] object-contain rounded-lg"
                />
              </div>
            )}

            {canManage && (
              <form
                onSubmit={handleUploadFileVersion}
                className="p-4 rounded-xl border bg-muted/20 space-y-2.5"
              >
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  {t.materials.form.uploadNewVersion}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="file"
                    required
                    onChange={(e) =>
                      setNewVersionFile(e.target.files?.[0] ?? null)
                    }
                    className="flex-1 text-xs"
                  />
                  <input
                    type="text"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder={t.materials.form.changeSummary}
                    className="px-3 py-1.5 rounded-xl border bg-background text-xs"
                  />
                  <button
                    type="submit"
                    disabled={saving || !newVersionFile}
                    className="px-3.5 py-1.5 rounded-xl bg-secondary hover:bg-accent text-xs font-semibold disabled:opacity-50"
                  >
                    {saving ? t.common.saving : t.common.save}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {material.type === "NOTE" && activeVersion && (
          <div className="space-y-3">
            {canManage && !editingNote && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setNoteDraft(activeVersion.noteContent ?? "");
                    setEditingNote(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium hover:bg-accent"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {t.common.edit}
                </button>
              </div>
            )}

            {editingNote ? (
              <form onSubmit={handleSaveNoteVersion} className="space-y-3">
                <textarea
                  rows={12}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  className="w-full p-3 rounded-xl border bg-background text-sm font-mono"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder={t.materials.form.changeSummary}
                    className="flex-1 px-3 py-2 rounded-xl border bg-background text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingNote(false)}
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
            ) : (
              <div className="p-4 sm:p-5 rounded-xl border bg-background/60">
                <MarkdownRenderer content={activeVersion.noteContent ?? ""} />
              </div>
            )}
          </div>
        )}

        {material.externalUrl && (
          <div className="space-y-3">
            {material.embedInfo?.embedUrl && (
              <div className="aspect-video w-full rounded-xl overflow-hidden border bg-black">
                <iframe
                  src={material.embedInfo.embedUrl}
                  title={material.title}
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            )}
            <a
              href={material.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              <ExternalLink className="h-4 w-4" />
              {t.materials.detail.openExternal} ({material.embedInfo?.provider})
            </a>
          </div>
        )}
      </div>

      {/* Version History & Comments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Version History */}
        <section className="rounded-2xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-base">
              {t.materials.detail.versionHistory}
            </h2>
          </div>
          <div className="space-y-2">
            {material.versions.map((ver) => (
              <div
                key={ver.id}
                className={cn(
                  "p-3 rounded-xl border text-xs space-y-1.5 cursor-pointer transition-colors",
                  activeVersion?.id === ver.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/40"
                )}
                onClick={() => setSelectedVersionId(ver.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">v{ver.versionNumber}</span>
                  <span className="text-muted-foreground">
                    {new Date(ver.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {ver.changeSummary && (
                  <p className="text-muted-foreground">{ver.changeSummary}</p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    {ver.editor.firstName}
                  </span>
                  {canManage && ver.versionNumber !== material.currentVersion && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreVersion(ver.id);
                      }}
                      className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {t.materials.detail.restoreVersion}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Comments */}
        <section className="lg:col-span-2 rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-base">
              {t.materials.detail.comments} ({material.comments.length})
            </h2>
          </div>

          <form onSubmit={handlePostComment} className="space-y-2">
            {replyToId && (
              <div className="text-xs text-primary flex items-center gap-2">
                <span>↪ {t.materials.detail.reply}</span>
                <button
                  type="button"
                  onClick={() => setReplyToId(null)}
                  className="underline text-muted-foreground"
                >
                  {t.common.cancel}
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t.materials.detail.commentPlaceholder}
                className="flex-1 px-3 py-2 rounded-xl border bg-background text-sm"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {t.materials.detail.postComment}
              </button>
            </div>
          </form>

          {topComments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t.materials.detail.noComments}
            </p>
          ) : (
            <div className="space-y-3">
              {topComments.map((c) => {
                const replies = repliesByParent.get(c.id) ?? [];
                return (
                  <div key={c.id} className="p-3.5 rounded-xl border space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold">
                        {c.author.firstName} {c.author.lastName ?? ""}
                      </span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{new Date(c.createdAt).toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => setReplyToId(c.id)}
                          className="text-primary hover:underline"
                        >
                          {t.materials.detail.reply}
                        </button>
                        {(user?.role === "ADMIN" || user?.id === c.author.id) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-destructive hover:underline"
                          >
                            {t.common.delete}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{c.body}</p>

                    {replies.length > 0 && (
                      <div className="pl-4 border-l-2 space-y-2 pt-1">
                        {replies.map((r) => (
                          <div key={r.id} className="text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">
                                {r.author.firstName} {r.author.lastName ?? ""}
                              </span>
                              {(user?.role === "ADMIN" ||
                                user?.id === r.author.id) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(r.id)}
                                  className="text-destructive hover:underline"
                                >
                                  {t.common.delete}
                                </button>
                              )}
                            </div>
                            <p className="text-sm">{r.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


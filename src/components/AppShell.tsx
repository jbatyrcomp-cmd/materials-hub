"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  BookOpen,
  CalendarDays,
  Clock,
  FileText,
  Home,
  Layers,
  LogOut,
  Moon,
  RefreshCw,
  Settings,
  ShieldX,
  Sun,
  Timer,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProvider";
import { AuthGate } from "@/components/AuthGate";

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    user,
    loading,
    lang,
    setLang,
    t,
    theme,
    toggleTheme,
    refreshUser,
    logout,
  } = useApp();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center animate-pulse">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  if (user.status !== "APPROVED") {
    const isRejected = user.status === "REJECTED";
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center space-y-4 shadow-sm">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === "uz" ? "tk" : "uz")}
              className="px-2.5 py-1 rounded-lg border text-xs font-semibold hover:bg-accent"
            >
              {lang === "uz" ? "O'Z" : "TK"}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border hover:bg-accent"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>

          <div
            className={cn(
              "h-12 w-12 rounded-2xl mx-auto flex items-center justify-center",
              isRejected
                ? "bg-destructive/15 text-destructive"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            )}
          >
            {isRejected ? (
              <ShieldX className="h-6 w-6" />
            ) : (
              <Clock className="h-6 w-6" />
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">
              {user.firstName} {user.lastName}
            </p>
            <h1 className="text-xl font-bold">
              {isRejected ? t.auth.rejectedTitle : t.auth.pendingTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRejected ? t.auth.rejectedDesc : t.auth.pendingDesc}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => refreshUser()}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5 hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              {t.auth.refreshStatus}
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="px-4 py-2 rounded-xl border text-sm font-medium inline-flex items-center gap-1.5 hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              {t.common.logout}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/materials", label: t.nav.materials, icon: FileText },
    { href: "/bookmarks", label: t.nav.bookmarks, icon: Bookmark },
    { href: "/calendar", label: t.nav.calendar, icon: CalendarDays },
    { href: "/tests", label: t.nav.tests, icon: Timer },
    { href: "/flashcards", label: t.nav.flashcards, icon: Layers },
    { href: "/leaderboard", label: t.nav.leaderboard, icon: Trophy },
    ...(user.role === "ADMIN"
      ? [{ href: "/admin", label: t.nav.admin, icon: Settings }]
      : []),
  ];

  const mobileTabs = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/materials", label: t.nav.materials, icon: FileText },
    { href: "/tests", label: t.nav.tests, icon: Timer },
    { href: "/flashcards", label: t.nav.flashcards, icon: Layers },
    { href: "/calendar", label: t.nav.calendar, icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-card px-4 py-5">
        <Link href="/" className="flex items-center gap-2.5 px-2 mb-6">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-base leading-tight truncate">
              {t.common.appName}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {t.common.appSubtitle}
            </p>
          </div>
        </Link>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex rounded-lg border p-0.5 bg-muted/50">
              <button
                type="button"
                onClick={() => setLang("uz")}
                className={cn(
                  "px-2 py-1 text-xs font-semibold rounded-md transition-colors",
                  lang === "uz"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                O&apos;Z
              </button>
              <button
                type="button"
                onClick={() => setLang("tk")}
                className={cn(
                  "px-2 py-1 text-xs font-semibold rounded-md transition-colors",
                  lang === "tk"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                TK
              </button>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t.common.themeToggle}
              className="p-2 rounded-lg border hover:bg-accent transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/50 border">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {user.firstName} {user.lastName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                    user.role === "ADMIN"
                      ? "bg-primary/15 text-primary"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {user.role === "ADMIN"
                    ? t.common.adminBadge
                    : t.common.memberBadge}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title={t.common.logout}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-30 border-b bg-card/95 backdrop-blur px-3 py-2.5 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm truncate">{t.common.appName}</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <Link
            href="/bookmarks"
            aria-label={t.nav.bookmarks}
            className={cn(
              "p-1.5 rounded-lg border transition-colors",
              pathname.startsWith("/bookmarks")
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            <Bookmark className="h-4 w-4" />
          </Link>
          <Link
            href="/leaderboard"
            aria-label={t.nav.leaderboard}
            className={cn(
              "p-1.5 rounded-lg border transition-colors",
              pathname.startsWith("/leaderboard")
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            <Trophy className="h-4 w-4" />
          </Link>
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              aria-label={t.nav.admin}
              className={cn(
                "p-1.5 rounded-lg border transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
            >
              <Settings className="h-4 w-4" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setLang(lang === "uz" ? "tk" : "uz")}
            className="px-2 py-1 rounded-lg border text-[11px] font-bold hover:bg-accent"
          >
            {lang === "uz" ? "O'Z" : "TK"}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border hover:bg-accent"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={logout}
            aria-label={t.common.logout}
            className="p-1.5 rounded-lg border text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto p-4 sm:p-6">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-card/95 backdrop-blur grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {mobileTabs.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 text-[10px] font-medium gap-1 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

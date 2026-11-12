"use client";

import React, { useState } from "react";
import { BookOpen, LogIn, Moon, Sun, UserPlus } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { cn } from "@/lib/utils";

export function AuthGate() {
  const { t, lang, setLang, theme, toggleTheme, refreshUser } = useApp();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          password,
          ...(mode === "register" ? { preferredLang: lang } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "INVALID_CREDENTIALS") {
          setError(t.auth.invalidCredentials);
        } else if (data.error === "USER_ALREADY_EXISTS") {
          setError(t.auth.userExists);
        } else {
          setError(data.error || "Error");
        }
        return;
      }
      await refreshUser();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">
                {t.common.appName}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {t.common.appSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === "uz" ? "tk" : "uz")}
              className="px-2.5 py-1.5 rounded-lg border text-xs font-semibold hover:bg-accent transition-colors"
            >
              {lang === "uz" ? "O'Z" : "TK"}
            </button>
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
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">{t.auth.title}</h2>
            <p className="text-sm text-muted-foreground">{t.auth.subtitle}</p>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={cn(
                "py-2 rounded-lg text-sm font-medium transition-colors",
                mode === "login"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.auth.loginTab}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={cn(
                "py-2 rounded-lg text-sm font-medium transition-colors",
                mode === "register"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.auth.registerTab}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">
                  {t.auth.firstName} *
                </label>
                <input
                  required
                  minLength={2}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">
                  {t.auth.lastName} *
                </label>
                <input
                  required
                  minLength={2}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1">
                {t.auth.password} *
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {mode === "register" && (
              <p className="text-xs text-muted-foreground">
                {t.auth.registerHint}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {mode === "login" ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {mode === "login" ? t.auth.loginButton : t.auth.registerButton}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

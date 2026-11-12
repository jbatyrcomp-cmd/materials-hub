"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getDictionary, type Dictionary, type Lang } from "@/i18n";

export interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "MEMBER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  preferredLang: Lang;
}

interface AppContextValue {
  user: AppUser | null;
  loading: boolean;
  lang: Lang;
  setLang: (lang: Lang) => Promise<void>;
  t: Dictionary;
  theme: "light" | "dark";
  toggleTheme: () => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLangState] = useState<Lang>("uz");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const applyTheme = useCallback((next: "light" | "dark") => {
    setTheme(next);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
    }
    try {
      localStorage.setItem("mh_theme", next);
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === "dark" ? "light" : "dark");
  }, [applyTheme, theme]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setLangState(data.user.preferredLang === "tk" ? "tk" : "uz");
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let initialLang: Lang = "uz";
    try {
      const savedLang = localStorage.getItem("mh_lang");
      if (savedLang === "tk" || savedLang === "uz") initialLang = savedLang;
      const savedTheme = localStorage.getItem("mh_theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        applyTheme(savedTheme);
      }
    } catch {
      // ignore
    }
    setLangState(initialLang);
    refreshUser();
  }, [applyTheme, refreshUser]);

  const setLang = useCallback(
    async (next: Lang) => {
      setLangState(next);
      try {
        localStorage.setItem("mh_lang", next);
      } catch {
        // ignore
      }
      if (user) {
        setUser((prev) => (prev ? { ...prev, preferredLang: next } : prev));
        await fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferredLang: next }),
        }).catch(() => null);
      }
    },
    [user]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    setUser(null);
  }, []);

  const t = getDictionary(lang);

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        lang,
        setLang,
        t,
        theme,
        toggleTheme,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

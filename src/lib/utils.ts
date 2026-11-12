import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value >= 10 || idx === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"`’‘ʻ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

export function parseJsonSafe<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export type EmbedProvider = "YOUTUBE" | "DRIVE" | "TELEGRAM" | "WEB";

export interface EmbedInfo {
  provider: EmbedProvider;
  embedUrl: string | null;
}

export function detectEmbedInfo(rawUrl: string): EmbedInfo {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      let videoId: string | null = null;
      if (host.includes("youtu.be")) {
        videoId = url.pathname.replace("/", "").split("/")[0] || null;
      } else if (url.pathname.startsWith("/shorts/")) {
        videoId = url.pathname.split("/")[2] || null;
      } else if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/")[2] || null;
      } else {
        videoId = url.searchParams.get("v");
      }
      return {
        provider: "YOUTUBE",
        embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : null,
      };
    }

    if (host.includes("drive.google.com")) {
      const match = url.pathname.match(/\/file\/d\/([^/]+)/);
      if (match?.[1]) {
        return {
          provider: "DRIVE",
          embedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
        };
      }
      return { provider: "DRIVE", embedUrl: null };
    }

    if (host === "t.me" || host.endsWith(".t.me")) {
      return { provider: "TELEGRAM", embedUrl: null };
    }

    return { provider: "WEB", embedUrl: null };
  } catch {
    return { provider: "WEB", embedUrl: null };
  }
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}


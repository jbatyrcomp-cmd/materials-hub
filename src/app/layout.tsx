import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/providers/AppProvider";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oquw Hub — Study Materials & Group Learning",
  description:
    "Collaborative group study materials, notes, timed tests, SM-2 flashcards and deadline calendar.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body>
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}

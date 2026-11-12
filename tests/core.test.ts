import { describe, expect, it } from "vitest";
import {
  hashPassword,
  normalizeFullName,
  verifyPassword,
} from "../src/lib/auth/password";
import { calculateSm2 } from "../src/lib/sm2";
import { computeRemainingSeconds, gradeTestAttempt } from "../src/lib/quiz";
import { detectEmbedInfo } from "../src/lib/utils";
import { parseBulkFlashcards } from "../src/lib/flashcards";
import { isInlinePreviewableMime, sanitizeFileName } from "../src/lib/storage";

describe("Name + Password authentication helpers", () => {
  it("normalizes full names consistently regardless of case or extra whitespace", () => {
    expect(normalizeFullName("  Azizbek ", "  Karimov  ")).toBe(
      "azizbek karimov"
    );
    expect(normalizeFullName("Myrat", "Gurbanow")).toBe("myrat gurbanow");
  });

  it("hashes and verifies passwords with unique random salts", () => {
    const hash1 = hashPassword("superSecret123");
    const hash2 = hashPassword("superSecret123");
    expect(hash1).not.toBe(hash2);
    expect(verifyPassword("superSecret123", hash1)).toBe(true);
    expect(verifyPassword("wrongPassword", hash1)).toBe(false);
    expect(verifyPassword("superSecret123", "malformed")).toBe(false);
  });
});

describe("SM-2 Spaced Repetition", () => {
  it("progresses intervals across GOOD reviews and resets on AGAIN", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const r1 = calculateSm2(null, "GOOD", now);
    expect(r1.repetitions).toBe(1);
    expect(r1.intervalDays).toBe(1);

    const r2 = calculateSm2(r1, "GOOD", now);
    expect(r2.repetitions).toBe(2);
    expect(r2.intervalDays).toBe(6);

    const r3 = calculateSm2(r2, "GOOD", now);
    expect(r3.repetitions).toBe(3);
    expect(r3.intervalDays).toBeGreaterThan(6);

    const reset = calculateSm2(r3, "AGAIN", now);
    expect(reset.repetitions).toBe(0);
    expect(reset.intervalDays).toBe(1);
    expect(reset.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});

describe("Official Test grading and timer", () => {
  it("grades SINGLE and MULTI choice questions strictly", () => {
    const questions = [
      { id: "q1", points: 2, correctOptionIds: ["b"] },
      { id: "q2", points: 3, correctOptionIds: ["a", "c"] },
    ];

    const perfect = gradeTestAttempt(questions, {
      q1: ["b"],
      q2: ["c", "a", "a"],
    });
    expect(perfect.score).toBe(5);
    expect(perfect.maxScore).toBe(5);

    const partialWrong = gradeTestAttempt(questions, {
      q1: ["b"],
      q2: ["a"],
    });
    expect(partialWrong.score).toBe(2);
  });

  it("clamps remaining seconds to 0 when expired", () => {
    const now = new Date("2026-01-01T10:05:00Z");
    expect(
      computeRemainingSeconds(new Date("2026-01-01T10:04:00Z"), now)
    ).toBe(0);
    expect(
      computeRemainingSeconds(new Date("2026-01-01T10:06:30Z"), now)
    ).toBe(90);
  });
});

describe("Embeds, bulk flashcards, and file security", () => {
  it("detects YouTube and Google Drive embed URLs", () => {
    expect(detectEmbedInfo("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      provider: "YOUTUBE",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
    expect(
      detectEmbedInfo("https://drive.google.com/file/d/abc123XYZ/view")
    ).toEqual({
      provider: "DRIVE",
      embedUrl: "https://drive.google.com/file/d/abc123XYZ/preview",
    });
    expect(detectEmbedInfo("https://t.me/mygroup/42").provider).toBe("TELEGRAM");
  });

  it("parses bulk flashcards safely", () => {
    const parsed = parseBulkFlashcards(
      "DNS | Dezoksiribonuklein\nInvalid line\nCPU\tCentral Processing Unit"
    );
    expect(parsed).toEqual([
      { front: "DNS", back: "Dezoksiribonuklein" },
      { front: "CPU", back: "Central Processing Unit" },
    ]);
  });

  it("sanitizes filenames and restricts inline preview to safe types", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(isInlinePreviewableMime("application/pdf")).toBe(true);
    expect(isInlinePreviewableMime("image/png")).toBe(true);
    expect(isInlinePreviewableMime("image/svg+xml")).toBe(false);
    expect(isInlinePreviewableMime("text/html")).toBe(false);
  });
});

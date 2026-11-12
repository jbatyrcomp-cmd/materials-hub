export type Sm2Rating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export interface Sm2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface Sm2Result extends Sm2State {
  nextReviewAt: Date;
}

const RATING_QUALITY: Record<Sm2Rating, number> = {
  AGAIN: 1,
  HARD: 3,
  GOOD: 4,
  EASY: 5,
};

/**
 * Computes the next SuperMemo-2 (SM-2) review state for a flashcard.
 */
export function calculateSm2(
  prev: Partial<Sm2State> | null | undefined,
  rating: Sm2Rating,
  now: Date = new Date()
): Sm2Result {
  const quality = RATING_QUALITY[rating];
  let easeFactor = prev?.easeFactor ?? 2.5;
  let intervalDays = prev?.intervalDays ?? 0;
  let repetitions = prev?.repetitions ?? 0;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      const multiplier = rating === "HARD" ? 0.8 : rating === "EASY" ? 1.3 : 1;
      intervalDays = Math.max(1, Math.round(intervalDays * easeFactor * multiplier));
    }
    repetitions += 1;
  }

  easeFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  const nextReviewAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    easeFactor: Number(easeFactor.toFixed(2)),
    intervalDays,
    repetitions,
    nextReviewAt,
  };
}


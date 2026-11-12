export interface GradeableQuestion {
  id: string;
  points: number;
  correctOptionIds: string[];
}

export interface QuestionBreakdown {
  questionId: string;
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
  selectedOptionIds: string[];
  correctOptionIds: string[];
}

export interface GradeResult {
  score: number;
  maxScore: number;
  breakdown: QuestionBreakdown[];
}

export function gradeTestAttempt(
  questions: GradeableQuestion[],
  answers: Record<string, string[]>
): GradeResult {
  let score = 0;
  let maxScore = 0;
  const breakdown: QuestionBreakdown[] = [];

  for (const q of questions) {
    const pts = Math.max(1, q.points);
    maxScore += pts;
    const selected = Array.from(new Set(answers[q.id] ?? [])).sort();
    const expected = Array.from(new Set(q.correctOptionIds)).sort();

    const isCorrect =
      selected.length === expected.length &&
      selected.every((val, index) => val === expected[index]);

    const earnedPoints = isCorrect ? pts : 0;
    score += earnedPoints;

    breakdown.push({
      questionId: q.id,
      isCorrect,
      earnedPoints,
      maxPoints: pts,
      selectedOptionIds: selected,
      correctOptionIds: expected,
    });
  }

  return { score, maxScore, breakdown };
}

export function computeRemainingSeconds(expiresAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
}

export function shuffleArray<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}


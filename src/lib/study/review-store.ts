import type { Card, ReviewMap } from "@/lib/study/fsrs";

export type ReviewStore = {
  load: () => Promise<ReviewMap>;
  save: (reviews: ReviewMap) => Promise<void>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseCard(value: Record<string, unknown>): Card | null {
  const due = toDate(value.due);
  if (!due) {
    return null;
  }
  const lastReview = toDate(value.last_review);
  return {
    due,
    stability: numberOr(value.stability, 0),
    difficulty: numberOr(value.difficulty, 0),
    elapsed_days: numberOr(value.elapsed_days, 0),
    scheduled_days: numberOr(value.scheduled_days, 0),
    reps: numberOr(value.reps, 0),
    lapses: numberOr(value.lapses, 0),
    learning_steps: numberOr(value.learning_steps, 0),
    state: numberOr(value.state, 0),
    ...(lastReview ? { last_review: lastReview } : {}),
  };
}

export function mergeReviews(persisted: unknown): ReviewMap {
  if (!isRecord(persisted)) {
    return {};
  }
  return Object.entries(persisted).reduce<ReviewMap>((acc, [id, value]) => {
    if (!isRecord(value)) {
      return acc;
    }
    const card = parseCard(value);
    return card ? { ...acc, [id]: card } : acc;
  }, {});
}

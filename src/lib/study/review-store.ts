import {
  MIN_EASE,
  STARTING_EASE,
  type CardReview,
  type ReviewMap,
} from "@/lib/study/scheduler";

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

function parseReview(value: unknown): CardReview {
  const record = isRecord(value) ? value : {};
  return {
    ease: Math.max(MIN_EASE, numberOr(record.ease, STARTING_EASE)),
    intervalDays: numberOr(record.intervalDays, 0),
    reps: numberOr(record.reps, 0),
    due: typeof record.due === "string" ? record.due : "",
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
    return { ...acc, [id]: parseReview(value) };
  }, {});
}

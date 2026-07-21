import type { ReviewLog } from "@/lib/study/fsrs";

export type RevlogEntry = { cid: string } & ReviewLog;
export type Revlog = RevlogEntry[];

export type RevlogStore = {
  load: () => Promise<Revlog>;
  save: (revlog: Revlog) => Promise<void>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toDate(value: unknown): Date {
  if (typeof value !== "string" && typeof value !== "number") {
    return new Date(0);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function parseEntry(value: unknown): RevlogEntry | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.cid !== "string" || typeof value.rating !== "number") {
    return null;
  }
  return {
    cid: value.cid,
    rating: value.rating,
    state: numberOr(value.state, 0),
    due: toDate(value.due),
    stability: numberOr(value.stability, 0),
    difficulty: numberOr(value.difficulty, 0),
    elapsed_days: numberOr(value.elapsed_days, 0),
    last_elapsed_days: numberOr(value.last_elapsed_days, 0),
    scheduled_days: numberOr(value.scheduled_days, 0),
    learning_steps: numberOr(value.learning_steps, 0),
    review: toDate(value.review),
  };
}

export function mergeRevlog(persisted: unknown): Revlog {
  if (!Array.isArray(persisted)) {
    return [];
  }
  return persisted
    .map(parseEntry)
    .filter((entry): entry is RevlogEntry => entry !== null);
}

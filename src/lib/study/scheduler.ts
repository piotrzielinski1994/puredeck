export type Grade = "Again" | "Hard" | "Good";

export type CardReview = {
  ease: number;
  intervalDays: number;
  reps: number;
  due: string;
};

export type ReviewMap = Record<string, CardReview>;

export const STARTING_EASE = 2.5;
export const MIN_EASE = 1.3;
export const FIRST_INTERVAL = 1;
export const SECOND_INTERVAL = 6;

const CORRECT_THRESHOLD = 3;

const QUALITY: Record<Grade, number> = { Again: 2, Hard: 3, Good: 4 };

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * 86_400_000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate(),
  )}`;
}

function nextEase(ease: number, quality: number): number {
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  return Math.max(MIN_EASE, ease + delta);
}

function nextInterval(state: CardReview): number {
  if (state.reps === 0) {
    return FIRST_INTERVAL;
  }
  if (state.reps === 1) {
    return SECOND_INTERVAL;
  }
  return Math.round(state.intervalDays * state.ease);
}

export function defaultReview(today: string): CardReview {
  return { ease: STARTING_EASE, intervalDays: 0, reps: 0, due: today };
}

export function schedule(
  state: CardReview,
  grade: Grade,
  today: string,
): CardReview {
  const quality = QUALITY[grade];
  const ease = nextEase(state.ease, quality);
  if (quality < CORRECT_THRESHOLD) {
    return { ease, intervalDays: 0, reps: 0, due: today };
  }
  const intervalDays = nextInterval(state);
  return {
    ease,
    intervalDays,
    reps: state.reps + 1,
    due: addDaysIso(today, intervalDays),
  };
}

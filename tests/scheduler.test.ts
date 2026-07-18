import { describe, expect, it } from "vitest";
import {
  MIN_EASE,
  defaultReview,
  schedule,
  type CardReview,
} from "@/lib/study/scheduler";

const TODAY = "2026-07-19";

describe("defaultReview (AC-001 / data model)", () => {
  it("should produce a new-card review that is due today with starting ease", () => {
    expect(defaultReview(TODAY)).toEqual({
      ease: 2.5,
      intervalDays: 0,
      reps: 0,
      due: TODAY,
    });
  });
});

describe("schedule new-card + Good (TC-001 / AC-001 / AC-002)", () => {
  it("should advance to reps 1, interval 1 day, due today+1, and leave ease at 2.5", () => {
    const state: CardReview = {
      ease: 2.5,
      intervalDays: 0,
      reps: 0,
      due: TODAY,
    };

    const next = schedule(state, "Good", TODAY);

    expect(next.reps).toBe(1);
    expect(next.intervalDays).toBe(1);
    expect(next.due).toBe("2026-07-20");
    expect(next.ease).toBeCloseTo(2.5, 5);
  });
});

describe("schedule interval growth (TC-002 / AC-001)", () => {
  it("should give a 6-day interval when Good is graded at reps 1", () => {
    const state: CardReview = {
      ease: 2.5,
      intervalDays: 1,
      reps: 1,
      due: TODAY,
    };

    const next = schedule(state, "Good", TODAY);

    expect(next.intervalDays).toBe(6);
    expect(next.reps).toBe(2);
    expect(next.due).toBe("2026-07-25");
  });

  it("should use round(interval * pre-update ease) when Good is graded at reps 2", () => {
    const state: CardReview = {
      ease: 2.5,
      intervalDays: 6,
      reps: 2,
      due: TODAY,
    };

    const next = schedule(state, "Good", TODAY);

    expect(next.intervalDays).toBe(15);
    expect(next.reps).toBe(3);
    expect(next.due).toBe("2026-08-03");
    expect(next.ease).toBeCloseTo(2.5, 5);
  });
});

describe("schedule new-card + Hard (TC-003 / AC-001 / AC-002)", () => {
  it("should keep a 1-day interval but penalise ease below the Good result", () => {
    const state: CardReview = {
      ease: 2.5,
      intervalDays: 0,
      reps: 0,
      due: TODAY,
    };

    const hard = schedule(state, "Hard", TODAY);
    const good = schedule(state, "Good", TODAY);

    expect(hard.intervalDays).toBe(1);
    expect(hard.reps).toBe(1);
    expect(hard.ease).toBeCloseTo(2.36, 2);
    expect(hard.ease).toBeLessThan(good.ease);
  });
});

describe("schedule Again lapse (TC-004 / AC-001 / AC-002 / AC-003)", () => {
  it("should reset reps and interval to 0, keep due today, and still penalise ease", () => {
    const state: CardReview = {
      ease: 2.5,
      intervalDays: 15,
      reps: 2,
      due: "2026-08-03",
    };

    const next = schedule(state, "Again", TODAY);

    expect(next.reps).toBe(0);
    expect(next.intervalDays).toBe(0);
    expect(next.due).toBe(TODAY);
    expect(next.ease).toBeLessThan(2.5);
    expect(next.ease).toBeGreaterThanOrEqual(MIN_EASE);
  });

  it("should produce a measurably different state from Hard and Good on the same input", () => {
    const state: CardReview = {
      ease: 2.5,
      intervalDays: 15,
      reps: 2,
      due: "2026-08-03",
    };

    const again = schedule(state, "Again", TODAY);
    const hard = schedule(state, "Hard", TODAY);
    const good = schedule(state, "Good", TODAY);

    expect(again).not.toEqual(hard);
    expect(again).not.toEqual(good);
    expect(hard).not.toEqual(good);
  });
});

describe("schedule ease floor (TC-005 / AC-001 / AC-003)", () => {
  it("should never drop ease below MIN_EASE across repeated Again grades", () => {
    const applied = Array.from({ length: 10 }).reduce<CardReview[]>(
      (history) => {
        const prev = history[history.length - 1];
        return [...history, schedule(prev, "Again", TODAY)];
      },
      [{ ease: 2.5, intervalDays: 0, reps: 0, due: TODAY }],
    );

    applied.forEach((review) => {
      expect(review.ease).toBeGreaterThanOrEqual(MIN_EASE);
    });
    expect(applied[applied.length - 1].ease).toBe(MIN_EASE);
  });
});

describe("schedule purity (TC-006 / AC-001)", () => {
  it("should return a new object and leave the input state deeply unchanged", () => {
    const state: CardReview = {
      ease: 2.5,
      intervalDays: 6,
      reps: 2,
      due: "2026-07-25",
    };
    const snapshot: CardReview = {
      ease: 2.5,
      intervalDays: 6,
      reps: 2,
      due: "2026-07-25",
    };

    const next = schedule(state, "Good", TODAY);

    expect(next).not.toBe(state);
    expect(state).toEqual(snapshot);
  });
});

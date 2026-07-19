import { describe, expect, it } from "vitest";
import { mergeReviews, type ReviewStore } from "@/lib/study/review-store";
import { createInMemoryReviewStore } from "@/lib/study/in-memory-review-store";
import {
  createScheduler,
  gradeReview,
  newCard,
  Rating,
  type ReviewMap,
} from "@/lib/study/fsrs";

function gradedMap(): ReviewMap {
  const scheduler = createScheduler();
  const now = new Date("2026-07-19T12:00:00Z");
  const c1 = gradeReview(scheduler, newCard(now), Rating.Good, "c1", now).card;
  const c2 = gradeReview(scheduler, newCard(now), Rating.Easy, "c2", now).card;
  return { c1, c2 };
}

describe("in-memory review store round-trip (TC-004 / AC-004)", () => {
  it("should return an equal map when load is called after save", async () => {
    const map = gradedMap();
    const store: ReviewStore = createInMemoryReviewStore();

    await store.save(map);
    const loaded = await store.load();

    expect(loaded).toEqual(map);
    expect(loaded.c1.due.getTime()).toBe(map.c1.due.getTime());
    expect(loaded.c1.state).toBe(map.c1.state);
    expect(loaded.c2.due.getTime()).toBe(map.c2.due.getTime());
  });

  it("should load the seeded initial map when constructed with one", async () => {
    const initial = gradedMap();
    const store = createInMemoryReviewStore(initial);

    const loaded = await store.load();

    expect(loaded).toEqual(initial);
    expect(loaded.c1.due.getTime()).toBe(initial.c1.due.getTime());
  });
});

describe("mergeReviews revival + validation (TC-005 / AC-004)", () => {
  it("should revive due and last_review to Date instances after a JSON round-trip", () => {
    const map = gradedMap();
    const persisted = JSON.parse(JSON.stringify(map));

    const merged = mergeReviews(persisted);

    expect(merged.c1.due).toBeInstanceOf(Date);
    expect(merged.c1.due.getTime()).toBe(map.c1.due.getTime());
    expect(merged.c1.last_review).toBeInstanceOf(Date);
    expect(merged.c1.last_review?.getTime()).toBe(
      map.c1.last_review?.getTime(),
    );
    expect(merged.c1.stability).toBe(map.c1.stability);
    expect(merged.c1.difficulty).toBe(map.c1.difficulty);
    expect(merged.c1.reps).toBe(map.c1.reps);
    expect(merged.c1.state).toBe(map.c1.state);
    expect(merged.c2.due.getTime()).toBe(map.c2.due.getTime());
  });

  it("should coerce garbage top-level blobs to an empty map without throwing", () => {
    const garbageBlobs: unknown[] = [null, undefined, "x", 42, [], true];

    garbageBlobs.forEach((blob) => {
      expect(() => mergeReviews(blob)).not.toThrow();
      expect(mergeReviews(blob)).toEqual({});
    });
  });

  it("should drop an entry that is missing a due field", () => {
    const merged = mergeReviews({ c1: { stability: 1 } });

    expect(merged).toEqual({});
  });

  it("should drop an entry whose due does not parse to a valid Date", () => {
    const merged = mergeReviews({ c1: { due: "not-a-date" } });

    expect(merged).toEqual({});
  });

  it("should default missing numeric fields to 0 while keeping a valid revived due", () => {
    const merged = mergeReviews({ c1: { due: "2026-07-20T00:00:00.000Z" } });

    expect(merged.c1.due).toBeInstanceOf(Date);
    expect(merged.c1.due.getTime()).toBe(
      new Date("2026-07-20T00:00:00.000Z").getTime(),
    );
    expect(merged.c1.stability).toBe(0);
    expect(merged.c1.difficulty).toBe(0);
    expect(merged.c1.elapsed_days).toBe(0);
    expect(merged.c1.scheduled_days).toBe(0);
    expect(merged.c1.reps).toBe(0);
    expect(merged.c1.lapses).toBe(0);
    expect(merged.c1.learning_steps).toBe(0);
    expect(merged.c1.state).toBe(0);
    expect(merged.c1.last_review).toBeUndefined();
  });

  it("should default non-numeric numeric fields to 0", () => {
    const merged = mergeReviews({
      c1: { due: "2026-07-20T00:00:00.000Z", stability: "x", reps: null },
    });

    expect(merged.c1.stability).toBe(0);
    expect(merged.c1.reps).toBe(0);
  });

  it("should keep an orphan card id whose entry is well-formed", () => {
    const scheduler = createScheduler();
    const now = new Date("2026-07-19T12:00:00Z");
    const orphan = gradeReview(
      scheduler,
      newCard(now),
      Rating.Good,
      "deleted-card",
      now,
    ).card;
    const persisted = JSON.parse(JSON.stringify({ "deleted-card": orphan }));

    const merged = mergeReviews(persisted);

    expect(Object.keys(merged)).toEqual(["deleted-card"]);
    expect(merged["deleted-card"].due).toBeInstanceOf(Date);
    expect(merged["deleted-card"].due.getTime()).toBe(orphan.due.getTime());
  });
});

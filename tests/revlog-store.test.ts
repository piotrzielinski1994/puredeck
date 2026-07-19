import { describe, expect, it } from "vitest";
import {
  mergeRevlog,
  type Revlog,
  type RevlogStore,
} from "@/lib/study/revlog-store";
import { createInMemoryRevlogStore } from "@/lib/study/in-memory-revlog-store";
import { createScheduler, gradeReview, newCard, Rating } from "@/lib/study/fsrs";

function gradedRevlog(): Revlog {
  const scheduler = createScheduler();
  const now = new Date("2026-07-19T12:00:00Z");
  const later = new Date("2026-07-19T12:10:00Z");
  const first = gradeReview(scheduler, newCard(now), Rating.Good, "c1", now);
  const second = gradeReview(scheduler, first.card, Rating.Easy, "c1", later);
  return [
    { cid: "c1", ...first.log },
    { cid: "c1", ...second.log },
  ];
}

describe("in-memory revlog store round-trip (TC-006 / AC-005)", () => {
  it("should return both appended entries in order, each tagged with its cid", async () => {
    const revlog = gradedRevlog();
    const store: RevlogStore = createInMemoryRevlogStore();

    await store.save(revlog);
    const loaded = await store.load();

    expect(loaded).toHaveLength(2);
    expect(loaded).toEqual(revlog);
    expect(loaded[0].cid).toBe("c1");
    expect(loaded[1].cid).toBe("c1");
    expect(loaded[0].rating).toBe(Rating.Good);
    expect(loaded[1].rating).toBe(Rating.Easy);
    expect(loaded[0].review.getTime()).toBe(revlog[0].review.getTime());
    expect(loaded[1].review.getTime()).toBe(revlog[1].review.getTime());
  });

  it("should load the seeded initial revlog when constructed with one", async () => {
    const initial = gradedRevlog();
    const store = createInMemoryRevlogStore(initial);

    const loaded = await store.load();

    expect(loaded).toEqual(initial);
    expect(loaded).toHaveLength(2);
  });
});

describe("mergeRevlog revival + validation (TC-007 / AC-005)", () => {
  it("should preserve the array and revive due and review to Date after a JSON round-trip", () => {
    const revlog = gradedRevlog();
    const persisted = JSON.parse(JSON.stringify(revlog));

    const merged = mergeRevlog(persisted);

    expect(merged).toHaveLength(2);
    expect(merged[0].cid).toBe("c1");
    expect(merged[0].due).toBeInstanceOf(Date);
    expect(merged[0].review).toBeInstanceOf(Date);
    expect(merged[0].due.getTime()).toBe(revlog[0].due.getTime());
    expect(merged[0].review.getTime()).toBe(revlog[0].review.getTime());
    expect(merged[0].rating).toBe(revlog[0].rating);
    expect(merged[1].review.getTime()).toBe(revlog[1].review.getTime());
  });

  it("should coerce a non-array top-level blob to an empty array without throwing", () => {
    const garbageBlobs: unknown[] = [null, undefined, {}, "x", 42, true];

    garbageBlobs.forEach((blob) => {
      expect(() => mergeRevlog(blob)).not.toThrow();
      expect(mergeRevlog(blob)).toEqual([]);
    });
  });

  it("should drop elements missing cid or rating and keep well-formed ones", () => {
    const persisted = [
      { cid: "keep", rating: 3, review: "2026-07-19T12:00:00.000Z" },
      { rating: 3 },
      { cid: "no-rating" },
      { cid: 5, rating: 3 },
      { cid: "bad-rating", rating: "x" },
      "garbage",
      null,
    ];

    const merged = mergeRevlog(persisted);

    expect(merged).toHaveLength(1);
    expect(merged[0].cid).toBe("keep");
    expect(merged[0].rating).toBe(3);
    expect(merged[0].review).toBeInstanceOf(Date);
  });

  it("should default missing numeric fields to 0 and state to 0", () => {
    const merged = mergeRevlog([{ cid: "c1", rating: 3 }]);

    expect(merged).toHaveLength(1);
    expect(merged[0].stability).toBe(0);
    expect(merged[0].difficulty).toBe(0);
    expect(merged[0].elapsed_days).toBe(0);
    expect(merged[0].last_elapsed_days).toBe(0);
    expect(merged[0].scheduled_days).toBe(0);
    expect(merged[0].learning_steps).toBe(0);
    expect(merged[0].state).toBe(0);
  });
});

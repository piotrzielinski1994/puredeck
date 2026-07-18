import { describe, expect, it } from "vitest";
import { mergeReviews, type ReviewStore } from "@/lib/study/review-store";
import { createInMemoryReviewStore } from "@/lib/study/in-memory-review-store";
import type { ReviewMap } from "@/lib/study/scheduler";

describe("in-memory review store round-trip (TC-011 / AC-004 / AC-008)", () => {
  it("should return an equal map when load is called after save", async () => {
    const map: ReviewMap = {
      c1: { ease: 2.5, intervalDays: 1, reps: 1, due: "2026-07-20" },
      c2: { ease: 1.9, intervalDays: 15, reps: 3, due: "2026-08-03" },
    };
    const store: ReviewStore = createInMemoryReviewStore();

    await store.save(map);
    const loaded = await store.load();

    expect(loaded).toEqual(map);
  });

  it("should load the seeded initial map when constructed with one", async () => {
    const initial: ReviewMap = {
      c1: { ease: 2.5, intervalDays: 6, reps: 2, due: "2026-07-25" },
    };
    const store = createInMemoryReviewStore(initial);

    expect(await store.load()).toEqual(initial);
  });
});

describe("mergeReviews validation (TC-012 / AC-008)", () => {
  it("should coerce garbage top-level blobs to an empty map without throwing", () => {
    const garbageBlobs: unknown[] = [
      null,
      undefined,
      "not-an-object",
      42,
      [],
      true,
    ];

    garbageBlobs.forEach((blob) => {
      expect(() => mergeReviews(blob)).not.toThrow();
      expect(mergeReviews(blob)).toEqual({});
    });
  });

  it("should preserve a well-formed review entry unchanged", () => {
    const persisted = {
      c1: { ease: 2.5, intervalDays: 1, reps: 1, due: "2026-07-20" },
    };

    const merged = mergeReviews(persisted);

    expect(merged.c1).toEqual({
      ease: 2.5,
      intervalDays: 1,
      reps: 1,
      due: "2026-07-20",
    });
  });

  it("should drop entries whose value is not a record", () => {
    const persisted = {
      good: { ease: 2.5, intervalDays: 1, reps: 1, due: "2026-07-20" },
      num: 42,
      str: "nope",
      nul: null,
      arr: [1, 2, 3],
    };

    const merged = mergeReviews(persisted);

    expect(Object.keys(merged)).toEqual(["good"]);
  });

  it("should default missing or non-numeric fields while keeping a valid due", () => {
    const persisted = {
      c1: { ease: "x", reps: null, due: "2026-07-20" },
    };

    const merged = mergeReviews(persisted);

    expect(merged.c1.ease).toBe(2.5);
    expect(merged.c1.reps).toBe(0);
    expect(merged.c1.intervalDays).toBe(0);
    expect(merged.c1.due).toBe("2026-07-20");
  });

  it("should tolerate an orphan card id with a valid review entry", () => {
    const persisted = {
      "deleted-card": {
        ease: 1.9,
        intervalDays: 15,
        reps: 3,
        due: "2026-08-03",
      },
    };

    const merged = mergeReviews(persisted);

    expect(merged["deleted-card"]).toEqual({
      ease: 1.9,
      intervalDays: 15,
      reps: 3,
      due: "2026-08-03",
    });
  });

  it("should not throw on a deeply malformed mixture and return only the salvageable entries", () => {
    const persisted = {
      valid: { ease: 2.5, intervalDays: 1, reps: 1, due: "2026-07-20" },
      partial: { due: "2026-07-21" },
      broken: "garbage",
    };

    expect(() => mergeReviews(persisted)).not.toThrow();
    const merged = mergeReviews(persisted);
    expect(Object.keys(merged).sort()).toEqual(["partial", "valid"]);
    expect(merged.partial.ease).toBe(2.5);
    expect(merged.partial.intervalDays).toBe(0);
    expect(merged.partial.reps).toBe(0);
  });
});

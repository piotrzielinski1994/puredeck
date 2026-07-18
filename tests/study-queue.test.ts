import { describe, expect, it } from "vitest";
import { buildStudyQueue, isDue } from "@/lib/study/queue";
import type { CardReview, ReviewMap } from "@/lib/study/scheduler";
import type { Deck } from "@/lib/workspace/model";

const TODAY = "2026-07-19";

function review(due: string): CardReview {
  return { ease: 2.5, intervalDays: 1, reps: 1, due };
}

function makeDeck(): Deck {
  return {
    id: "es",
    name: "Spanish",
    cards: [
      { id: "c1", front: "uno", back: "one" },
      { id: "c2", front: "dos", back: "two" },
      { id: "c3", front: "tres", back: "three" },
      { id: "c4", front: "cuatro", back: "four" },
    ],
  };
}

describe("isDue (AC-005)", () => {
  it("should treat a new card with no review as due", () => {
    expect(isDue(undefined, TODAY)).toBe(true);
  });

  it("should treat a card due today as due", () => {
    expect(isDue(review(TODAY), TODAY)).toBe(true);
  });

  it("should treat a card due in the past as due", () => {
    expect(isDue(review("2026-07-01"), TODAY)).toBe(true);
  });

  it("should treat a card due in the future as not due", () => {
    expect(isDue(review("2026-07-20"), TODAY)).toBe(false);
  });
});

describe("buildStudyQueue due filter (TC-007 / AC-005)", () => {
  it("should return only new and due cards, preserving deck order", () => {
    const deck = makeDeck();
    const reviews: ReviewMap = {
      c2: review(TODAY),
      c3: review("2026-08-01"),
      c4: review("2026-07-10"),
    };

    const queue = buildStudyQueue(deck, reviews, TODAY);

    expect(queue.map((card) => card.id)).toEqual(["c1", "c2", "c4"]);
  });
});

describe("buildStudyQueue none due (TC-008 / AC-005 / AC-007)", () => {
  it("should return an empty queue when every card is future-due", () => {
    const deck = makeDeck();
    const reviews: ReviewMap = {
      c1: review("2026-07-20"),
      c2: review("2026-08-01"),
      c3: review("2026-12-31"),
      c4: review("2027-01-01"),
    };

    const queue = buildStudyQueue(deck, reviews, TODAY);

    expect(queue).toEqual([]);
  });
});

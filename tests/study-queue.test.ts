import { describe, expect, it } from "vitest";
import {
  createScheduler,
  type Card as FsrsCard,
  gradeReview,
  newCard,
  Rating,
  type ReviewMap,
} from "@/lib/study/fsrs";
import { buildStudyQueue, isDue, nowDate } from "@/lib/study/queue";
import type { Deck } from "@/lib/workspace/model";

const NOW = new Date("2026-07-19T12:00:00Z");
const PAST_SAME_DAY = new Date("2026-07-19T06:00:00Z");
const FUTURE_SAME_DAY = new Date("2026-07-19T18:00:00Z");
const CARD_ANCHOR = new Date("2020-01-01T00:00:00Z");

function fsrsCardDueAt(due: Date): FsrsCard {
  return { ...newCard(CARD_ANCHOR), due };
}

function futureReviewCard(cid: string): FsrsCard {
  const scheduler = createScheduler();
  const learnAt = new Date("2026-07-19T12:00:00Z");
  const graduateAt = new Date("2026-07-19T12:10:00Z");
  const learning = gradeReview(
    scheduler,
    newCard(learnAt),
    Rating.Good,
    cid,
    learnAt,
  );
  return gradeReview(scheduler, learning.card, Rating.Good, cid, graduateAt)
    .card;
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

describe("isDue (AC-006)", () => {
  it("should treat a new card with no review entry as due", () => {
    expect(isDue(undefined, NOW)).toBe(true);
  });

  it("should treat a card whose due datetime is in the past as due", () => {
    expect(isDue(fsrsCardDueAt(PAST_SAME_DAY), NOW)).toBe(true);
  });

  it("should treat a card whose due datetime exactly equals now as due", () => {
    expect(isDue(fsrsCardDueAt(new Date(NOW.getTime())), NOW)).toBe(true);
  });

  it("should treat a card due later the same day as not due", () => {
    expect(isDue(fsrsCardDueAt(FUTURE_SAME_DAY), NOW)).toBe(false);
  });
});

describe("buildStudyQueue due filter (TC-008 / AC-006)", () => {
  it("should return the new, past, and due-now cards in deck order and exclude the future card", () => {
    const deck = makeDeck();
    const future = futureReviewCard("c4");

    expect(future.due.getTime()).toBeGreaterThan(NOW.getTime());

    const reviews: ReviewMap = {
      c2: fsrsCardDueAt(PAST_SAME_DAY),
      c3: fsrsCardDueAt(new Date(NOW.getTime())),
      c4: future,
    };

    const queue = buildStudyQueue(deck, reviews, NOW);

    expect(queue.map((card) => card.id)).toEqual(["c1", "c2", "c3"]);
  });
});

describe("buildStudyQueue none due (TC-009 / AC-006)", () => {
  it("should return an empty queue when every card is due in the future", () => {
    const deck = makeDeck();
    const reviews: ReviewMap = {
      c1: fsrsCardDueAt(FUTURE_SAME_DAY),
      c2: fsrsCardDueAt(new Date("2026-07-20T00:00:00Z")),
      c3: fsrsCardDueAt(new Date("2026-12-31T00:00:00Z")),
      c4: futureReviewCard("c4"),
    };

    const queue = buildStudyQueue(deck, reviews, NOW);

    expect(queue).toEqual([]);
  });
});

describe("nowDate", () => {
  it("should return the current instant as a Date", () => {
    expect(nowDate()).toBeInstanceOf(Date);
  });
});

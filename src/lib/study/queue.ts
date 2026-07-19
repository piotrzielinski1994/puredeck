import type { Card, Deck } from "@/lib/workspace/model";
import type { Card as FsrsCard, ReviewMap } from "@/lib/study/fsrs";

export function nowDate(): Date {
  return new Date();
}

export function isDue(review: FsrsCard | undefined, now: Date): boolean {
  if (!review) {
    return true;
  }
  return review.due.getTime() <= now.getTime();
}

export function buildStudyQueue(
  deck: Deck,
  reviews: ReviewMap,
  now: Date,
): Card[] {
  return deck.cards.filter((card) => isDue(reviews[card.id], now));
}

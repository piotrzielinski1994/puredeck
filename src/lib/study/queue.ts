import type { Card, Deck } from "@/lib/workspace/model";
import type { CardReview, ReviewMap } from "@/lib/study/scheduler";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isDue(review: CardReview | undefined, today: string): boolean {
  if (!review) {
    return true;
  }
  return review.due <= today;
}

export function buildStudyQueue(
  deck: Deck,
  reviews: ReviewMap,
  today: string,
): Card[] {
  return deck.cards.filter((card) => isDue(reviews[card.id], today));
}

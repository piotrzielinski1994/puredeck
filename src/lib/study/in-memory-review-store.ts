import type { ReviewMap } from "@/lib/study/fsrs";
import type { ReviewStore } from "@/lib/study/review-store";

export function createInMemoryReviewStore(
  initial: ReviewMap = {},
): ReviewStore {
  let current = initial;
  return {
    load: () => Promise.resolve(current),
    save: (reviews) => {
      current = reviews;
      return Promise.resolve();
    },
  };
}

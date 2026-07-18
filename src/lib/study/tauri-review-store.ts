import { LazyStore } from "@tauri-apps/plugin-store";
import type { ReviewMap } from "@/lib/study/scheduler";
import { mergeReviews, type ReviewStore } from "@/lib/study/review-store";

const REVIEW_FILE = "review-state.json";
const REVIEWS_KEY = "reviews";

export function createTauriReviewStore(): ReviewStore {
  const store = new LazyStore(REVIEW_FILE);

  const load = async (): Promise<ReviewMap> => {
    const persisted = await store
      .get<unknown>(REVIEWS_KEY)
      .catch(() => undefined);
    return mergeReviews(persisted);
  };

  const save = async (reviews: ReviewMap): Promise<void> => {
    await store
      .set(REVIEWS_KEY, reviews)
      .then(() => store.save())
      .catch((error) => {
        console.error("Failed to persist reviews:", error);
      });
  };

  return { load, save };
}

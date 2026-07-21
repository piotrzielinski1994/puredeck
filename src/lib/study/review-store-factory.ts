import { isTauri } from "@tauri-apps/api/core";
import { createInMemoryReviewStore } from "@/lib/study/in-memory-review-store";
import type { ReviewStore } from "@/lib/study/review-store";
import { createTauriReviewStore } from "@/lib/study/tauri-review-store";

export function createReviewStore(): ReviewStore {
  return isTauri() ? createTauriReviewStore() : createInMemoryReviewStore();
}

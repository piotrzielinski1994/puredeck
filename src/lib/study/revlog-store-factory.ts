import { isTauri } from "@tauri-apps/api/core";
import { createInMemoryRevlogStore } from "@/lib/study/in-memory-revlog-store";
import { createTauriRevlogStore } from "@/lib/study/tauri-revlog-store";
import type { RevlogStore } from "@/lib/study/revlog-store";

export function createRevlogStore(): RevlogStore {
  return isTauri() ? createTauriRevlogStore() : createInMemoryRevlogStore();
}

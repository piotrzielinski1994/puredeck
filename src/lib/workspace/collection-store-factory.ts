import { isTauri } from "@tauri-apps/api/core";
import type { CollectionStore } from "@/lib/workspace/collection";
import { seedFileMap } from "@/lib/workspace/collection";
import { SEED_DECKS } from "@/lib/workspace/demo-data";
import { createInMemoryCollectionStore } from "@/lib/workspace/in-memory-collection";
import { createTauriCollectionStore } from "@/lib/workspace/tauri-collection";

export function createCollectionStore(
  collectionPath?: string,
): CollectionStore {
  return isTauri()
    ? createTauriCollectionStore(collectionPath)
    : createInMemoryCollectionStore(seedFileMap(SEED_DECKS));
}

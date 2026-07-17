import { isTauri } from "@tauri-apps/api/core";
import type { CollectionStore } from "@/lib/workspace/collection";
import { createInMemoryCollectionStore } from "@/lib/workspace/in-memory-collection";
import { createTauriCollectionStore } from "@/lib/workspace/tauri-collection";
import { seedFileMap } from "@/lib/workspace/collection";
import { DEMO_DECKS } from "@/lib/workspace/demo-data";

export function createCollectionStore(collectionPath?: string): CollectionStore {
  return isTauri()
    ? createTauriCollectionStore(collectionPath)
    : createInMemoryCollectionStore(seedFileMap(DEMO_DECKS));
}

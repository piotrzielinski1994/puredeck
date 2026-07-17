import type { Deck } from "@/lib/workspace/model";
import {
  decksFromFileMap,
  seedFileMap,
  type CollectionStore,
} from "@/lib/workspace/collection";
import { DEMO_DECKS } from "@/lib/workspace/demo-data";

export function createInMemoryCollectionStore(
  files: Record<string, string> = {},
): CollectionStore {
  const load = (): Promise<Deck[]> => {
    if (Object.keys(files).length === 0) {
      Object.assign(files, seedFileMap(DEMO_DECKS));
    }
    return Promise.resolve(decksFromFileMap(files));
  };
  return { load };
}

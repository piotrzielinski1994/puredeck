import {
  exists,
  mkdir,
  readDir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import type { Deck } from "@/lib/workspace/model";
import {
  parseDeck,
  seedFileMap,
  type CollectionStore,
} from "@/lib/workspace/collection";
import { DEMO_DECKS } from "@/lib/workspace/demo-data";

const COLLECTION_DIR = "collections";

async function collectionRoot(override?: string): Promise<string> {
  if (override) {
    return override;
  }
  const dir = await appDataDir();
  return join(dir, COLLECTION_DIR);
}

async function jsonFileNames(root: string): Promise<string[]> {
  const entries = await readDir(root);
  return entries
    .filter((entry) => !entry.isDirectory && entry.name.endsWith(".json"))
    .map((entry) => entry.name);
}

async function seedDemoDecks(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  const files = seedFileMap(DEMO_DECKS);
  await Promise.all(
    Object.entries(files).map(([slug, content]) =>
      writeTextFile(`${root}/${slug}.json`, content),
    ),
  );
}

async function readDecks(root: string): Promise<Deck[]> {
  const names = await jsonFileNames(root);
  const raws = await Promise.all(
    names.map((name) => readTextFile(`${root}/${name}`)),
  );
  return raws
    .map(parseDeck)
    .filter((deck): deck is Deck => deck !== null);
}

export function createTauriCollectionStore(
  collectionPath?: string,
): CollectionStore {
  const load = async (): Promise<Deck[]> => {
    try {
      const root = await collectionRoot(collectionPath);
      const dirExists = await exists(root);
      const names = dirExists ? await jsonFileNames(root) : [];
      if (names.length === 0) {
        await seedDemoDecks(root);
      }
      return await readDecks(root);
    } catch (error) {
      console.error("Failed to load collections:", error);
      return DEMO_DECKS;
    }
  };
  return { load };
}

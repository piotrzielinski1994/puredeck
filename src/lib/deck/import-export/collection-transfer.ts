import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import {
  parseCollectionFile,
  serializeCollection,
} from "@/lib/deck/import-export/collection-file";
import type { Deck } from "@/lib/workspace/model";

export const SUGGESTED_FILE_NAME = "puredeck-collection.json";

const JSON_FILTER = { name: "puredeck-collection", extensions: ["json"] };

export type ExportResult =
  | { kind: "done"; count: number }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

export type ImportResult =
  | { kind: "done"; decks: Deck[] }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function exportCollection(decks: Deck[]): Promise<ExportResult> {
  const path = await save({
    defaultPath: SUGGESTED_FILE_NAME,
    filters: [JSON_FILTER],
  });
  if (path === null) {
    return { kind: "cancelled" };
  }
  try {
    await writeTextFile(path, serializeCollection(decks));
    return { kind: "done", count: decks.length };
  } catch (error) {
    return { kind: "error", message: errorMessage(error) };
  }
}

export async function importCollection(): Promise<ImportResult> {
  const path = await open({
    multiple: false,
    filters: [JSON_FILTER],
  });
  if (typeof path !== "string") {
    return { kind: "cancelled" };
  }
  try {
    const raw = await readTextFile(path);
    const parsed = parseCollectionFile(raw);
    if (!parsed.ok) {
      return { kind: "error", message: parsed.message };
    }
    return { kind: "done", decks: parsed.decks };
  } catch (error) {
    return { kind: "error", message: errorMessage(error) };
  }
}

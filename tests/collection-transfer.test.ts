import { beforeEach, describe, expect, it, vi } from "vitest";
import { serializeCollection } from "@/lib/deck/import-export/collection-file";
import {
  exportCollection,
  importCollection,
  SUGGESTED_FILE_NAME,
} from "@/lib/deck/import-export/collection-transfer";
import type { Deck } from "@/lib/workspace/model";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  open: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: mocks.open,
  save: mocks.save,
}));
vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn(async () => false),
  mkdir: vi.fn(async () => {}),
  readDir: vi.fn(async () => []),
  readTextFile: mocks.readTextFile,
  remove: vi.fn(async () => {}),
  writeTextFile: mocks.writeTextFile,
}));

const deckSpanish: Deck = {
  id: "spanish",
  name: "Spanish",
  cards: [{ id: "es1", front: "hola", back: "hello" }],
};

const deckCapitals: Deck = {
  id: "capitals",
  name: "Capitals",
  cards: [{ id: "cap1", front: "France", back: "Paris" }],
};

beforeEach(() => {
  mocks.save.mockReset();
  mocks.open.mockReset();
  mocks.readTextFile.mockReset();
  mocks.writeTextFile.mockReset();
});

describe("SUGGESTED_FILE_NAME (UI states)", () => {
  it("should suggest puredeck-collection.json as the default export file name", () => {
    expect(SUGGESTED_FILE_NAME).toBe("puredeck-collection.json");
  });
});

describe("exportCollection happy path (AC-001 / TC-001)", () => {
  it("should write the serialized collection bytes to the chosen path and report the deck count", async () => {
    mocks.save.mockResolvedValue("/picked/puredeck-collection.json");

    const result = await exportCollection([deckSpanish, deckCapitals]);

    expect(result).toEqual({ kind: "done", count: 2 });
    expect(mocks.writeTextFile).toHaveBeenCalledTimes(1);
    const [path, contents] = mocks.writeTextFile.mock.calls[0];
    expect(path).toBe("/picked/puredeck-collection.json");
    expect(contents).toBe(
      serializeCollection([deckSpanish, deckCapitals]),
    );
  });

  it("should offer a json filter and the suggested default name in the save dialog", async () => {
    mocks.save.mockResolvedValue("/picked/anywhere.json");

    await exportCollection([deckSpanish]);

    expect(mocks.save).toHaveBeenCalledTimes(1);
    const [options] = mocks.save.mock.calls[0];
    expect(JSON.stringify(options)).toContain(SUGGESTED_FILE_NAME);
    expect(JSON.stringify(options?.filters ?? [])).toContain("json");
  });
});

describe("exportCollection cancel (AC-007 / TC-009)", () => {
  it("should resolve cancelled and leave the filesystem untouched if the save dialog is dismissed", async () => {
    mocks.save.mockResolvedValue(null);

    const result = await exportCollection([deckSpanish]);

    expect(result).toEqual({ kind: "cancelled" });
    expect(mocks.writeTextFile).not.toHaveBeenCalled();
  });
});

describe("importCollection happy path (TC-004)", () => {
  it("should return the decks parsed from the chosen file", async () => {
    mocks.open.mockResolvedValue("/picked/inbox.json");
    mocks.readTextFile.mockResolvedValue(
      serializeCollection([deckSpanish, deckCapitals]),
    );

    const result = await importCollection();

    expect(result).toEqual({
      kind: "done",
      decks: [deckSpanish, deckCapitals],
    });
    expect(mocks.readTextFile).toHaveBeenCalledWith("/picked/inbox.json");
  });
});

describe("importCollection cancel (AC-007 / TC-009)", () => {
  it("should resolve cancelled and read nothing if the open dialog is dismissed", async () => {
    mocks.open.mockResolvedValue(null);

    const result = await importCollection();

    expect(result).toEqual({ kind: "cancelled" });
    expect(mocks.readTextFile).not.toHaveBeenCalled();
  });
});

describe("importCollection invalid file (AC-006 / TC-006)", () => {
  it("should surface the parser message as an error result without writing anything", async () => {
    mocks.open.mockResolvedValue("/picked/broken.json");
    mocks.readTextFile.mockResolvedValue("{ not json");

    const result = await importCollection();

    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.message.length).toBeGreaterThan(0);
    }
    expect(mocks.writeTextFile).not.toHaveBeenCalled();
  });

  it("should surface an error for structurally broken payloads such as a foreign format marker", async () => {
    mocks.open.mockResolvedValue("/picked/foreign.json");
    mocks.readTextFile.mockResolvedValue(
      JSON.stringify({ format: "something-else", version: 1, decks: [] }),
    );

    const result = await importCollection();

    expect(result.kind).toBe("error");
  });
});

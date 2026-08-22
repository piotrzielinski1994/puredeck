import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { Sidebar } from "@/components/workspace/sidebar";
import { WorkspaceProvider } from "@/components/workspace/workspace-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import { DEFAULT_SETTINGS } from "@/lib/settings/settings";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemoryReviewStore } from "@/lib/study/in-memory-review-store";
import { createInMemoryRevlogStore } from "@/lib/study/in-memory-revlog-store";
import { serializeDeck } from "@/lib/workspace/collection";
import { createInMemoryCollectionStore } from "@/lib/workspace/in-memory-collection";
import type { Deck } from "@/lib/workspace/model";

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  save: vi.fn(),
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

function renderSidebarWithStore(files: Record<string, string>) {
  const settingsStore = createInMemorySettingsStore({
    ...DEFAULT_SETTINGS,
    openTabIds: [],
    activeTabId: null,
  });
  const store = createInMemoryCollectionStore(files);
  render(
    <ToastProvider>
      <SettingsProvider store={settingsStore}>
        <WorkspaceProvider
          store={store}
          reviewStore={createInMemoryReviewStore()}
          revlogStore={createInMemoryRevlogStore()}
        >
          <Sidebar />
        </WorkspaceProvider>
      </SettingsProvider>
    </ToastProvider>,
  );
  return { store, files };
}

const statusRegion = () => screen.getByRole("status");
const exportButton = () =>
  screen.getByRole("button", { name: "Export collection..." });
const importButton = () =>
  screen.getByRole("button", { name: "Import collection..." });

beforeEach(() => {
  mocks.open.mockReset();
  mocks.save.mockReset();
  mocks.readTextFile.mockReset();
  mocks.writeTextFile.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("Sidebar collection transfer footer (UI states / AC-001 entry points)", () => {
  it("should offer touch-sized Export collection... and Import collection... buttons next to New deck at default render", async () => {
    renderSidebarWithStore({ spanish: serializeDeck(deckSpanish) });

    await screen.findByText("Spanish");

    const newDeckButton = screen.getByRole("button", { name: "+ New deck" });
    for (const button of [newDeckButton, exportButton(), importButton()]) {
      expect(button.className).toContain("min-h-11");
    }
  });
});

describe("Sidebar Export collection... success (AC-001 / UI states)", () => {
  it("should confirm the exported deck count after writing the chosen file", async () => {
    const user = userEvent.setup();
    renderSidebarWithStore({
      spanish: serializeDeck(deckSpanish),
      capitals: serializeDeck(deckCapitals),
    });
    await screen.findByText("Spanish");
    mocks.save.mockResolvedValue("/picked/puredeck-collection.json");

    await user.click(exportButton());

    await waitFor(() => {
      expect(
        within(statusRegion()).getByText(/exported 2 decks\./i),
      ).toBeInTheDocument();
    });
    expect(mocks.writeTextFile).toHaveBeenCalledTimes(1);
    const [path, contents] = mocks.writeTextFile.mock.calls[0];
    expect(path).toBe("/picked/puredeck-collection.json");
    expect(JSON.parse(contents as string).decks).toHaveLength(2);
  });
});

describe("Sidebar Export collection... cancel (AC-007 / TC-009)", () => {
  it("should stay silent and write nothing if the save dialog is cancelled", async () => {
    const user = userEvent.setup();
    renderSidebarWithStore({ spanish: serializeDeck(deckSpanish) });
    await screen.findByText("Spanish");
    mocks.save.mockResolvedValue(null);

    await user.click(exportButton());

    await waitFor(() => expect(statusRegion()).toHaveTextContent(""));
    expect(mocks.writeTextFile).not.toHaveBeenCalled();
  });
});

describe("Sidebar Export collection... failure (error state)", () => {
  it("should surface the failure cause and keep the deck list unchanged if writing fails", async () => {
    const user = userEvent.setup();
    renderSidebarWithStore({ spanish: serializeDeck(deckSpanish) });
    await screen.findByText("Spanish");
    mocks.save.mockResolvedValue("/picked/x.json");
    mocks.writeTextFile.mockRejectedValue(new Error("disk full"));

    await user.click(exportButton());

    await waitFor(() => {
      expect(
        within(statusRegion()).getByText(/disk full/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Spanish")).toBeInTheDocument();
    expect(screen.queryByText("Capitals")).not.toBeInTheDocument();
  });
});

describe("Sidebar Import collection... success (AC-004 / TC-004)", () => {
  it("should add the picked decks to the sidebar and confirm the count if the file is valid", async () => {
    const user = userEvent.setup();
    const { store, files } = renderSidebarWithStore({
      spanish: serializeDeck(deckSpanish),
    });
    await screen.findByText("Spanish");
    mocks.open.mockResolvedValue("/picked/inbox.json");
    mocks.readTextFile.mockResolvedValue(
      JSON.stringify({
        format: "puredeck-collection",
        version: 1,
        decks: [JSON.parse(JSON.stringify(deckCapitals))],
      }),
    );

    await user.click(importButton());

    expect(await screen.findByText("Capitals")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        within(statusRegion()).getByText(/imported 1 decks\./i),
      ).toBeInTheDocument();
    });
    const reloaded = await store.load();
    expect(reloaded.map((deck) => deck.id).sort()).toEqual([
      "capitals",
      "spanish",
    ]);
    expect(Object.keys(files)).toHaveLength(2);
  });
});

describe("Sidebar Import collection... invalid file (AC-006 / TC-006)", () => {
  it("should show an error naming the problem and leave the collection unchanged if the picked file is not a puredeck collection", async () => {
    const user = userEvent.setup();
    const { files } = renderSidebarWithStore({
      spanish: serializeDeck(deckSpanish),
    });
    await screen.findByText("Spanish");
    mocks.open.mockResolvedValue("/picked/broken.json");
    mocks.readTextFile.mockResolvedValue("{ truncated json");

    await user.click(importButton());

    await waitFor(() => {
      expect(statusRegion().textContent?.length).toBeGreaterThan(0);
    });
    expect(screen.getByText("Spanish")).toBeInTheDocument();
    expect(screen.queryByText("Capitals")).not.toBeInTheDocument();
    expect(Object.keys(files)).toHaveLength(1);
  });
});

describe("Sidebar Import collection... cancel (AC-007 / TC-009)", () => {
  it("should stay silent and read nothing if the open dialog is cancelled", async () => {
    const user = userEvent.setup();
    renderSidebarWithStore({ spanish: serializeDeck(deckSpanish) });
    await screen.findByText("Spanish");
    mocks.open.mockResolvedValue(null);

    await user.click(importButton());

    await waitFor(() => expect(statusRegion()).toHaveTextContent(""));
    expect(mocks.readTextFile).not.toHaveBeenCalled();
  });
});

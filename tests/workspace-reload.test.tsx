import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  useWorkspace,
  WorkspaceProvider,
} from "@/components/workspace/workspace-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import { DEFAULT_SETTINGS } from "@/lib/settings/settings";
import { SettingsProvider, useSettings } from "@/lib/settings/settings-context";
import { serializeDeck } from "@/lib/workspace/collection";
import { createInMemoryCollectionStore } from "@/lib/workspace/in-memory-collection";
import type { Deck } from "@/lib/workspace/model";
import { SETTINGS_TAB_ID } from "@/lib/workspace/model";

const deckAlpha: Deck = {
  id: "a",
  name: "Alpha",
  cards: [{ id: "a1", front: "uno", back: "one" }],
};
const deckSpanish: Deck = {
  id: "spanish",
  name: "Spanish",
  cards: [{ id: "es1", front: "hola", back: "hello" }],
};

const PATH_B = "/folder-b";
const storeA = createInMemoryCollectionStore({
  alpha: serializeDeck(deckAlpha),
});
const storeB = createInMemoryCollectionStore({
  spanish: serializeDeck(deckSpanish),
});

vi.mock("@/lib/workspace/collection-store-factory", () => ({
  createCollectionStore: (collectionPath?: string) =>
    collectionPath === PATH_B ? storeB : storeA,
}));

function Probe() {
  const { decks, tabs } = useWorkspace();
  const settings = useSettings();
  return (
    <div>
      <ul aria-label="decks">
        {decks.map((deck) => (
          <li key={deck.id}>{deck.name}</li>
        ))}
      </ul>
      <ul aria-label="tabs">
        {tabs.map((tab) => (
          <li key={tab.id}>{tab.label}</li>
        ))}
      </ul>
      <button type="button" onClick={() => settings.saveCollectionPath(PATH_B)}>
        switch folder
      </button>
    </div>
  );
}

function renderWorkspace() {
  const settingsStore = createInMemorySettingsStore({
    ...DEFAULT_SETTINGS,
    openTabIds: ["a", SETTINGS_TAB_ID],
    activeTabId: "a",
  });
  render(
    <SettingsProvider store={settingsStore}>
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>
    </SettingsProvider>,
  );
}

const decksList = () => screen.getByRole("list", { name: "decks" });
const tabsList = () => screen.getByRole("list", { name: "tabs" });

afterEach(() => {
  cleanup();
});

describe("WorkspaceProvider live reload (AC-006)", () => {
  it("should swap the deck list in place if collectionPath changes", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await waitFor(() => {
      expect(within(decksList()).getByText("Alpha")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /switch folder/i }));

    await waitFor(() => {
      expect(within(decksList()).getByText("Spanish")).toBeInTheDocument();
    });
    expect(within(decksList()).queryByText("Alpha")).not.toBeInTheDocument();
  });
});

describe("WorkspaceProvider tab prune on reload (AC-007)", () => {
  it("should close a deck tab whose deck is absent after reload while keeping Settings", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await waitFor(() => {
      expect(within(tabsList()).getByText("Alpha")).toBeInTheDocument();
    });
    expect(within(tabsList()).getByText("Settings")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /switch folder/i }));

    await waitFor(() => {
      expect(within(decksList()).getByText("Spanish")).toBeInTheDocument();
    });
    expect(within(tabsList()).queryByText("Alpha")).not.toBeInTheDocument();
    expect(within(tabsList()).getByText("Settings")).toBeInTheDocument();
  });
});

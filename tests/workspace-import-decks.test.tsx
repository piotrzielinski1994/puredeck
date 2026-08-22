import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import {
  useWorkspace,
  WorkspaceProvider,
} from "@/components/workspace/workspace-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import { DEFAULT_SETTINGS } from "@/lib/settings/settings";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemoryReviewStore } from "@/lib/study/in-memory-review-store";
import { createInMemoryRevlogStore } from "@/lib/study/in-memory-revlog-store";
import {
  type CollectionStore,
  parseDeck,
  serializeDeck,
} from "@/lib/workspace/collection";
import { createInMemoryCollectionStore } from "@/lib/workspace/in-memory-collection";
import type { Deck } from "@/lib/workspace/model";

type ImportSurface = ReturnType<typeof useWorkspace> & {
  importDecks: (incoming: Deck[]) => number;
};

const deckSpanish: Deck = {
  id: "spanish",
  name: "Spanish",
  cards: [
    { id: "es1", front: "hola", back: "hello" },
    { id: "es2", front: "gato", back: "cat" },
  ],
};

const deckCapitals: Deck = {
  id: "capitals",
  name: "Capitals",
  cards: [{ id: "cap1", front: "France", back: "Paris" }],
};

const deckFrench: Deck = {
  id: "french",
  name: "French",
  cards: [{ id: "fr1", front: "chien", back: "dog" }],
};

function ImportProbe({ incoming }: { incoming: Deck[] }) {
  const ctx = useWorkspace() as ImportSurface;
  const { decks, importDecks } = ctx;
  const [count, setCount] = useState("-");

  return (
    <div>
      <ul aria-label="decks">
        {decks.map((deck) => (
          <li key={deck.id}>{deck.name}</li>
        ))}
      </ul>
      <span data-testid="import-count">{count}</span>
      <button
        type="button"
        onClick={() => setCount(String(importDecks(incoming)))}
      >
        import batch
      </button>
    </div>
  );
}

function renderImport(store: CollectionStore, incoming: Deck[]) {
  const settingsStore = createInMemorySettingsStore({
    ...DEFAULT_SETTINGS,
    openTabIds: [],
    activeTabId: null,
  });
  render(
    <ToastProvider>
      <SettingsProvider store={settingsStore}>
        <WorkspaceProvider
          store={store}
          reviewStore={createInMemoryReviewStore()}
          revlogStore={createInMemoryRevlogStore()}
        >
          <ImportProbe incoming={incoming} />
        </WorkspaceProvider>
      </SettingsProvider>
    </ToastProvider>,
  );
  return store;
}

const decksList = () => screen.getByRole("list", { name: "decks" });
const importBatchButton = () =>
  screen.getByRole("button", { name: /import batch/i });

afterEach(() => {
  cleanup();
});

describe("WorkspaceProvider importDecks append (AC-004 / TC-004)", () => {
  it("should append incoming decks in order, persist one file per deck through the store, and report the count", async () => {
    const user = userEvent.setup();
    const files: Record<string, string> = {
      spanish: serializeDeck(deckSpanish),
    };
    const store = createInMemoryCollectionStore(files);
    renderImport(store, [deckCapitals, deckFrench]);

    await waitFor(() =>
      expect(within(decksList()).getByText("Spanish")).toBeInTheDocument(),
    );

    await user.click(importBatchButton());

    await waitFor(() => {
      const names = within(decksList())
        .getAllByRole("listitem")
        .map((li) => li.textContent);
      expect(names).toEqual(["Spanish", "Capitals", "French"]);
    });
    expect(screen.getByTestId("import-count")).toHaveTextContent("2");

    const reloaded = await store.load();
    expect(reloaded.map((deck) => deck.id)).toEqual([
      "spanish",
      "capitals",
      "french",
    ]);
    expect(Object.keys(files)).toHaveLength(3);
    const capitalsSlug = Object.keys(files).find(
      (slug) => parseDeck(files[slug])?.id === "capitals",
    );
    expect(parseDeck(files[capitalsSlug as string])).toEqual(deckCapitals);
    const frenchSlug = Object.keys(files).find(
      (slug) => parseDeck(files[slug])?.id === "french",
    );
    expect(parseDeck(files[frenchSlug as string])).toEqual(deckFrench);
  });

  it("should confirm the import with an Imported N decks message", async () => {
    const user = userEvent.setup();
    const files: Record<string, string> = {
      spanish: serializeDeck(deckSpanish),
    };
    const store = createInMemoryCollectionStore(files);
    renderImport(store, [deckCapitals, deckFrench]);

    await waitFor(() =>
      expect(within(decksList()).getByText("Spanish")).toBeInTheDocument(),
    );

    await user.click(importBatchButton());

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Imported 2 decks.",
    );
  });
});

describe("WorkspaceProvider importDecks collision (AC-005 / TC-005)", () => {
  it("should keep the stored original intact and add the colliding copy under fresh ids keeping its name", async () => {
    const user = userEvent.setup();
    const files: Record<string, string> = {
      spanish: serializeDeck(deckSpanish),
    };
    const store = createInMemoryCollectionStore(files);
    renderImport(store, [
      {
        id: "spanish",
        name: "Spanish",
        cards: [{ id: "zz9", front: "perro", back: "dog" }],
      },
    ]);

    await waitFor(() =>
      expect(within(decksList()).getByText("Spanish")).toBeInTheDocument(),
    );

    await user.click(importBatchButton());

    await waitFor(async () => {
      const reloaded = await store.load();
      expect(reloaded).toHaveLength(2);
    });
    const reloaded = await store.load();

    const kept = reloaded.find((deck) => deck.id === "spanish");
    expect(kept).toEqual(deckSpanish);

    const copies = reloaded.filter((deck) => deck.id !== "spanish");
    expect(copies).toHaveLength(1);
    const copy = copies[0];
    expect(copy.id.length).toBeGreaterThan(0);
    expect(copy.id).not.toBe("spanish");
    expect(copy.name).toBe("Spanish");
    expect(copy.cards).toHaveLength(1);
    expect(copy.cards[0].front).toBe("perro");
    expect(copy.cards[0].back).toBe("dog");
    expect(copy.cards[0].id).not.toBe("zz9");

    expect(within(decksList()).getAllByText("Spanish")).toHaveLength(2);

    expect(Object.keys(files)).toHaveLength(2);
    const originalOnDisk = Object.values(files).find(
      (raw) => parseDeck(raw)?.id === "spanish",
    );
    expect(originalOnDisk).toBe(serializeDeck(deckSpanish));
  });
});

describe("WorkspaceProvider importDecks empty batch (AC-008 / TC-010)", () => {
  it("should report zero imports and persist nothing when the incoming batch is empty", async () => {
    const user = userEvent.setup();
    const files: Record<string, string> = {
      spanish: serializeDeck(deckSpanish),
    };
    const before = { ...files };
    const store = createInMemoryCollectionStore(files);
    renderImport(store, []);

    await waitFor(() =>
      expect(within(decksList()).getByText("Spanish")).toBeInTheDocument(),
    );

    await user.click(importBatchButton());

    expect(screen.getByTestId("import-count")).toHaveTextContent("0");
    expect(files).toEqual(before);
    expect(await store.load()).toHaveLength(1);
  });
});

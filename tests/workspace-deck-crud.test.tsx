import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import { DEFAULT_SETTINGS } from "@/lib/settings/settings";
import { ToastProvider } from "@/components/ui/toast";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@/components/workspace/workspace-context";
import { createInMemoryCollectionStore } from "@/lib/workspace/in-memory-collection";
import { createInMemoryReviewStore } from "@/lib/study/in-memory-review-store";
import { createInMemoryRevlogStore } from "@/lib/study/in-memory-revlog-store";
import {
  serializeDeck,
  type CollectionStore,
} from "@/lib/workspace/collection";
import { studyTabId } from "@/lib/workspace/model";
import type { Deck } from "@/lib/workspace/model";

type DeckCrudSurface = ReturnType<typeof useWorkspace> & {
  createDeck: () => string;
  renameDeck: (id: string, name: string) => void;
  deleteDeck: (id: string) => void;
  renamingDeckId: string | null;
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

function Probe() {
  const ctx = useWorkspace() as DeckCrudSurface;
  const {
    decks,
    tabs,
    activeTabId,
    renamingDeckId,
    createDeck,
    renameDeck,
    deleteDeck,
    openDeck,
    openStudy,
  } = ctx;

  return (
    <div>
      <ul aria-label="decks">
        {decks.map((deck) => (
          <li key={deck.id}>{deck.name}</li>
        ))}
      </ul>
      <ul aria-label="tabs">
        {tabs.map((tab) => (
          <li key={tab.id}>{tab.id}</li>
        ))}
      </ul>
      <span data-testid="active-tab">{activeTabId ?? "none"}</span>
      <span data-testid="renaming-id">{renamingDeckId ?? "none"}</span>
      <span data-testid="has-actions">
        {[createDeck, renameDeck, deleteDeck].every(
          (fn) => typeof fn === "function",
        )
          ? "yes"
          : "no"}
      </span>

      <button type="button" onClick={() => createDeck()}>
        create
      </button>
      <button type="button" onClick={() => renameDeck("spanish", "Espanol")}>
        rename to espanol
      </button>
      <button type="button" onClick={() => renameDeck("spanish", "   ")}>
        commit blank rename
      </button>
      <button type="button" onClick={() => openDeck("capitals")}>
        open capitals
      </button>
      <button type="button" onClick={() => openStudy("capitals")}>
        study capitals
      </button>
      <button type="button" onClick={() => deleteDeck("capitals")}>
        delete capitals
      </button>
    </div>
  );
}

function renderWorkspace(store: CollectionStore, openTabIds: string[] = []) {
  const settingsStore = createInMemorySettingsStore({
    ...DEFAULT_SETTINGS,
    openTabIds,
    activeTabId: openTabIds[0] ?? null,
  });
  render(
    <ToastProvider>
      <SettingsProvider store={settingsStore}>
        <WorkspaceProvider
          store={store}
          reviewStore={createInMemoryReviewStore()}
          revlogStore={createInMemoryRevlogStore()}
        >
          <Probe />
        </WorkspaceProvider>
      </SettingsProvider>
    </ToastProvider>,
  );
}

const decksList = () => screen.getByRole("list", { name: "decks" });
const tabsList = () => screen.getByRole("list", { name: "tabs" });

afterEach(() => {
  cleanup();
});

describe("WorkspaceProvider createDeck (AC-001 / TC-001)", () => {
  it("should add a new deck, open it as a tab, and flag it for inline rename", async () => {
    const user = userEvent.setup();
    const store = createInMemoryCollectionStore({
      spanish: serializeDeck(deckSpanish),
    });
    renderWorkspace(store);

    await waitFor(() =>
      expect(
        within(decksList()).getByText("Spanish"),
      ).toBeInTheDocument(),
    );
    const deckCountBefore =
      within(decksList()).getAllByRole("listitem").length;

    await user.click(screen.getByRole("button", { name: /^create$/i }));

    expect(within(decksList()).getAllByRole("listitem")).toHaveLength(
      deckCountBefore + 1,
    );
    const newId = screen.getByTestId("renaming-id").textContent ?? "";
    expect(newId).not.toBe("none");
    expect(screen.getByTestId("active-tab")).toHaveTextContent(newId);
    expect(
      within(tabsList())
        .getAllByRole("listitem")
        .some((li) => li.textContent === newId),
    ).toBe(true);
  });
});

describe("WorkspaceProvider renameDeck (AC-005 / TC-002)", () => {
  it("should persist the new name while keeping the deck id and cards intact", async () => {
    const user = userEvent.setup();
    const store = createInMemoryCollectionStore({
      spanish: serializeDeck(deckSpanish),
    });
    renderWorkspace(store);

    await waitFor(() =>
      expect(within(decksList()).getByText("Spanish")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /rename to espanol/i }));

    expect(within(decksList()).getByText("Espanol")).toBeInTheDocument();
    expect(within(decksList()).queryByText("Spanish")).not.toBeInTheDocument();

    const reloaded = await store.load();
    const renamed = reloaded.find((deck) => deck.id === "spanish");
    expect(renamed?.name).toBe("Espanol");
    expect(renamed?.cards).toEqual(deckSpanish.cards);
  });
});

describe("WorkspaceProvider blank rename (AC-006 / TC-003)", () => {
  it("should keep the previous name if a whitespace-only rename is committed", async () => {
    const user = userEvent.setup();
    const store = createInMemoryCollectionStore({
      spanish: serializeDeck(deckSpanish),
    });
    renderWorkspace(store);

    await waitFor(() =>
      expect(within(decksList()).getByText("Spanish")).toBeInTheDocument(),
    );

    expect(screen.getByTestId("has-actions")).toHaveTextContent("yes");

    await user.click(
      screen.getByRole("button", { name: /commit blank rename/i }),
    );

    expect(within(decksList()).getByText("Spanish")).toBeInTheDocument();
    const reloaded = await store.load();
    expect(reloaded.find((deck) => deck.id === "spanish")?.name).toBe(
      "Spanish",
    );
  });
});

describe("WorkspaceProvider deleteDeck tab prune (AC-009 / TC-007)", () => {
  it("should remove the deck, prune its deck and study tabs, and fall the active tab back to a survivor", async () => {
    const user = userEvent.setup();
    const store = createInMemoryCollectionStore({
      spanish: serializeDeck(deckSpanish),
      capitals: serializeDeck(deckCapitals),
    });
    renderWorkspace(store, ["spanish"]);

    await waitFor(() =>
      expect(within(decksList()).getByText("Capitals")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /open capitals/i }));
    await user.click(screen.getByRole("button", { name: /study capitals/i }));

    const studyTab = studyTabId("capitals");
    await waitFor(() => {
      const tabIds = within(tabsList())
        .getAllByRole("listitem")
        .map((li) => li.textContent);
      expect(tabIds).toContain("capitals");
      expect(tabIds).toContain(studyTab);
    });

    await user.click(screen.getByRole("button", { name: /delete capitals/i }));

    await waitFor(() =>
      expect(within(decksList()).queryByText("Capitals")).not.toBeInTheDocument(),
    );
    const tabIdsAfter = within(tabsList())
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(tabIdsAfter).not.toContain("capitals");
    expect(tabIdsAfter).not.toContain(studyTab);
    expect(screen.getByTestId("active-tab")).toHaveTextContent("spanish");
    expect(await store.load()).toHaveLength(1);
  });
});

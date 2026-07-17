import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@/components/workspace/workspace-context";
import { createInMemoryCollectionStore } from "@/lib/workspace/in-memory-collection";
import { serializeDeck } from "@/lib/workspace/collection";
import type { Deck } from "@/lib/workspace/model";

const deckA: Deck = {
  id: "a",
  name: "Alpha",
  cards: [{ id: "a1", front: "uno", back: "one" }],
};

const deckB: Deck = {
  id: "b",
  name: "Beta",
  cards: [{ id: "b1", front: "dos", back: "two" }],
};

function DeckNames() {
  const { decks } = useWorkspace();
  return (
    <ul>
      {decks.map((deck) => (
        <li key={deck.id}>{deck.name}</li>
      ))}
    </ul>
  );
}

afterEach(() => {
  cleanup();
});

describe("WorkspaceProvider collection load (AC-001 / AC-005 / TC-001)", () => {
  it("should load decks from an injected CollectionStore into the workspace", async () => {
    const store = createInMemoryCollectionStore({
      alpha: serializeDeck(deckA),
      beta: serializeDeck(deckB),
    });

    render(
      <SettingsProvider store={createInMemorySettingsStore()}>
        <WorkspaceProvider store={store}>
          <DeckNames />
        </WorkspaceProvider>
      </SettingsProvider>,
    );

    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("should render no deck rows before the async load resolves", () => {
    const store = createInMemoryCollectionStore({
      alpha: serializeDeck(deckA),
    });

    render(
      <SettingsProvider store={createInMemorySettingsStore()}>
        <WorkspaceProvider store={store}>
          <DeckNames />
        </WorkspaceProvider>
      </SettingsProvider>,
    );

    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });
});

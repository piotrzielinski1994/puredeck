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
import { DeleteDeckDialog } from "@/components/workspace/delete-deck-dialog";
import { createInMemoryCollectionStore } from "@/lib/workspace/in-memory-collection";
import { createInMemoryReviewStore } from "@/lib/study/in-memory-review-store";
import { createInMemoryRevlogStore } from "@/lib/study/in-memory-revlog-store";
import { serializeDeck } from "@/lib/workspace/collection";
import type { Deck } from "@/lib/workspace/model";

type DeleteSurface = ReturnType<typeof useWorkspace> & {
  requestDeleteDeck: (id: string) => void;
};

const deckCapitals: Deck = {
  id: "capitals",
  name: "Capitals",
  cards: [{ id: "cap1", front: "France", back: "Paris" }],
};

function DeleteControl() {
  const { requestDeleteDeck } = useWorkspace() as DeleteSurface;
  return (
    <button type="button" onClick={() => requestDeleteDeck("capitals")}>
      request delete capitals
    </button>
  );
}

function DeckNames() {
  const { decks } = useWorkspace();
  return (
    <ul aria-label="decks">
      {decks.map((deck) => (
        <li key={deck.id}>{deck.name}</li>
      ))}
    </ul>
  );
}

function renderDialog() {
  const store = createInMemoryCollectionStore({
    capitals: serializeDeck(deckCapitals),
  });
  render(
    <ToastProvider>
      <SettingsProvider store={createInMemorySettingsStore(DEFAULT_SETTINGS)}>
        <WorkspaceProvider
          store={store}
          reviewStore={createInMemoryReviewStore()}
          revlogStore={createInMemoryRevlogStore()}
        >
          <DeleteControl />
          <DeckNames />
          <DeleteDeckDialog />
        </WorkspaceProvider>
      </SettingsProvider>
    </ToastProvider>,
  );
  return store;
}

afterEach(() => {
  cleanup();
});

describe("DeleteDeckDialog (AC-007 / TC-005 / TC-006)", () => {
  it("should stay closed until a delete is requested", async () => {
    renderDialog();

    await screen.findByText("Capitals");
    expect(screen.queryByText('Delete "Capitals"?')).not.toBeInTheDocument();
  });

  it("should show a title naming the pending deck once a delete is requested", async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByText("Capitals");
    await user.click(
      screen.getByRole("button", { name: /request delete capitals/i }),
    );

    expect(await screen.findByText('Delete "Capitals"?')).toBeInTheDocument();
  });

  it("should remove the deck if the Delete button confirms (TC-005)", async () => {
    const user = userEvent.setup();
    const store = renderDialog();

    await screen.findByText("Capitals");
    await user.click(
      screen.getByRole("button", { name: /request delete capitals/i }),
    );
    await screen.findByText('Delete "Capitals"?');

    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: /^delete$/i }),
    );

    await waitFor(() =>
      expect(screen.queryByText("Capitals")).not.toBeInTheDocument(),
    );
    expect(
      (await store.load()).find((deck) => deck.id === "capitals"),
    ).toBeUndefined();
  });

  it("should keep the deck if the Cancel button dismisses (TC-006)", async () => {
    const user = userEvent.setup();
    const store = renderDialog();

    await screen.findByText("Capitals");
    await user.click(
      screen.getByRole("button", { name: /request delete capitals/i }),
    );
    await screen.findByText('Delete "Capitals"?');

    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: /cancel/i }),
    );

    await waitFor(() =>
      expect(screen.queryByText('Delete "Capitals"?')).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Capitals")).toBeInTheDocument();
    expect(await store.load()).toHaveLength(1);
  });
});

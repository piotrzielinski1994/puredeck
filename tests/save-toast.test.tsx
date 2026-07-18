import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { ToastProvider } from "@/components/ui/toast";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings/settings";
import { ThemeProvider } from "@/lib/theme/theme-context";
import { WorkspaceProvider } from "@/components/workspace/workspace-context";
import { Main } from "@/components/workspace/main";
import { createInMemoryCollectionStore } from "@/lib/workspace/in-memory-collection";
import { serializeDeck, type CollectionStore } from "@/lib/workspace/collection";
import { SETTINGS_TAB_ID, type Deck } from "@/lib/workspace/model";

const deck: Deck = {
  id: "a",
  name: "Alpha",
  cards: [{ id: "a1", front: "uno", back: "one" }],
};

function seedTabs(openTabIds: string[], activeTabId: string): Settings {
  return { ...DEFAULT_SETTINGS, openTabIds, activeTabId };
}

function renderApp(store: CollectionStore, seed: Settings): void {
  render(
    <ToastProvider>
      <HotkeysProvider>
        <SettingsProvider store={createInMemorySettingsStore(seed)}>
          <ThemeProvider>
            <WorkspaceProvider store={store}>
              <Main />
            </WorkspaceProvider>
          </ThemeProvider>
        </SettingsProvider>
      </HotkeysProvider>
    </ToastProvider>,
  );
}

function fireModS(): void {
  fireEvent.keyDown(document, { key: "s", code: "KeyS", ctrlKey: true });
}

afterEach(() => {
  cleanup();
});

describe("save toast + Cmd+S (AC-002 / AC-004 / AC-005)", () => {
  it("should show a Saved toast if a card is edited and blurred (TC-002)", async () => {
    const user = userEvent.setup();
    const store = createInMemoryCollectionStore({ alpha: serializeDeck(deck) });
    renderApp(store, seedTabs([deck.id], deck.id));

    const front = await screen.findByLabelText(`Front of ${deck.cards[0].front}`);
    await user.clear(front);
    await user.type(front, "changed");
    await user.click(screen.getByLabelText("New card front"));

    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
  });

  it("should save the active deck and show a Saved toast if Mod+S is pressed on a deck tab (TC-004)", async () => {
    const base = createInMemoryCollectionStore({ alpha: serializeDeck(deck) });
    const save = vi.fn(base.save);
    const store: CollectionStore = { ...base, save };
    renderApp(store, seedTabs([deck.id], deck.id));

    await screen.findByLabelText(`Front of ${deck.cards[0].front}`);
    await act(async () => {});

    fireModS();

    expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: deck.id }));
    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
  });

  it("should commit a focused pending edit if Mod+S is pressed with a card input focused (E-1)", async () => {
    const user = userEvent.setup();
    const base = createInMemoryCollectionStore({ alpha: serializeDeck(deck) });
    const save = vi.fn(base.save);
    const store: CollectionStore = { ...base, save };
    renderApp(store, seedTabs([deck.id], deck.id));

    const front = await screen.findByLabelText(`Front of ${deck.cards[0].front}`);
    await user.clear(front);
    await user.type(front, "changed");

    fireModS();

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: deck.id,
        cards: [expect.objectContaining({ id: "a1", front: "changed" })],
      }),
    );
    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
  });

  it("should not save or toast if Mod+S is pressed while the settings tab is active (TC-005)", async () => {
    const base = createInMemoryCollectionStore({ alpha: serializeDeck(deck) });
    const save = vi.fn(base.save);
    const store: CollectionStore = { ...base, save };
    renderApp(store, seedTabs([SETTINGS_TAB_ID], SETTINGS_TAB_ID));

    await screen.findByRole("button", { name: /system/i });
    await act(async () => {});

    fireModS();

    expect(save).not.toHaveBeenCalled();
    expect(screen.queryByText(/saved/i)).toBeNull();
  });
});

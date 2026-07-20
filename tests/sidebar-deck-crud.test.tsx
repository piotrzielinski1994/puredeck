import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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
import { Sidebar } from "@/components/workspace/sidebar";
import { createInMemoryCollectionStore } from "@/lib/workspace/in-memory-collection";
import { createInMemoryReviewStore } from "@/lib/study/in-memory-review-store";
import { createInMemoryRevlogStore } from "@/lib/study/in-memory-revlog-store";
import { serializeDeck } from "@/lib/workspace/collection";
import type { Deck } from "@/lib/workspace/model";

const deckSpanish: Deck = {
  id: "spanish",
  name: "Spanish",
  cards: [{ id: "es1", front: "hola", back: "hello" }],
};

type DeleteSurface = ReturnType<typeof useWorkspace> & {
  pendingDeleteDeckId: string | null;
};

function PendingDeleteProbe() {
  const { pendingDeleteDeckId } = useWorkspace() as DeleteSurface;
  return (
    <span data-testid="pending-delete">{pendingDeleteDeckId ?? "none"}</span>
  );
}

function renderSidebar() {
  const settingsStore = createInMemorySettingsStore({
    ...DEFAULT_SETTINGS,
    openTabIds: [],
    activeTabId: null,
  });
  const store = createInMemoryCollectionStore({
    spanish: serializeDeck(deckSpanish),
  });
  render(
    <ToastProvider>
      <SettingsProvider store={settingsStore}>
        <WorkspaceProvider
          store={store}
          reviewStore={createInMemoryReviewStore()}
          revlogStore={createInMemoryRevlogStore()}
        >
          <Sidebar />
          <PendingDeleteProbe />
        </WorkspaceProvider>
      </SettingsProvider>
    </ToastProvider>,
  );
  return store;
}

afterEach(() => {
  cleanup();
});

describe("Sidebar New deck via deck-list context menu (AC-001 / TC-001)", () => {
  it("should create a new deck row if New deck is chosen from the deck-list context menu", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await screen.findByText("Spanish");

    fireEvent.contextMenu(screen.getByRole("navigation", { name: /decks/i }));
    await user.click(await screen.findByRole("menuitem", { name: /new deck/i }));

    expect(await screen.findByDisplayValue("New Deck")).toBeInTheDocument();
  });
});

describe("Sidebar context menu (AC-003 / TC-002 / TC-004)", () => {
  it("should open a menu with Rename and Delete if a deck row is right-clicked", async () => {
    renderSidebar();

    fireEvent.contextMenu(await screen.findByText("Spanish"));

    expect(
      await screen.findByRole("menuitem", { name: /rename/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /delete/i }),
    ).toBeInTheDocument();
  });
});

describe("Sidebar inline rename (AC-004 / TC-002)", () => {
  it("should show a text input pre-filled with the current name if Rename is chosen", async () => {
    const user = userEvent.setup();
    renderSidebar();

    fireEvent.contextMenu(await screen.findByText("Spanish"));
    await user.click(await screen.findByRole("menuitem", { name: /rename/i }));

    expect(screen.getByRole("textbox")).toHaveValue("Spanish");
  });

  it("should commit the new name if Enter is pressed in the rename input", async () => {
    const user = userEvent.setup();
    const store = renderSidebar();

    fireEvent.contextMenu(await screen.findByText("Spanish"));
    await user.click(await screen.findByRole("menuitem", { name: /rename/i }));

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Espanol{Enter}");

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(await screen.findByText("Espanol")).toBeInTheDocument();
    await waitFor(async () => {
      const reloaded = await store.load();
      expect(reloaded.find((deck) => deck.id === "spanish")?.name).toBe(
        "Espanol",
      );
    });
  });

  it("should restore the original name if Escape is pressed in the rename input", async () => {
    const user = userEvent.setup();
    renderSidebar();

    fireEvent.contextMenu(await screen.findByText("Spanish"));
    await user.click(await screen.findByRole("menuitem", { name: /rename/i }));

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "discarded{Escape}");

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Spanish")).toBeInTheDocument();
    expect(screen.queryByText("discarded")).not.toBeInTheDocument();
  });

  it("should commit the new name if the rename input is blurred", async () => {
    const user = userEvent.setup();
    renderSidebar();

    fireEvent.contextMenu(await screen.findByText("Spanish"));
    await user.click(await screen.findByRole("menuitem", { name: /rename/i }));

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Blurred");
    fireEvent.blur(input);

    expect(await screen.findByText("Blurred")).toBeInTheDocument();
  });
});

describe("Sidebar delete request (AC-004 / TC-004)", () => {
  it("should flag the deck for deletion if Delete is chosen from the row menu", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await screen.findByText("Spanish");
    expect(screen.getByTestId("pending-delete")).toHaveTextContent("none");

    fireEvent.contextMenu(screen.getByText("Spanish"));
    await user.click(await screen.findByRole("menuitem", { name: /delete/i }));

    await waitFor(() =>
      expect(screen.getByTestId("pending-delete")).toHaveTextContent("spanish"),
    );
  });
});

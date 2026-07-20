import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SettingsProvider,
  useSettings,
} from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import { DEFAULT_SETTINGS } from "@/lib/settings/settings";
import type { SettingsStore } from "@/lib/settings/settings";

const CUSTOM_PATH = "/Users/me/Decks";
const OTHER_PATH = "/Users/me/Other";

function PathProbe() {
  const settings = useSettings();
  return (
    <div>
      <span data-testid="path">
        {settings.settings.collectionPath ?? "none"}
      </span>
      <button
        type="button"
        onClick={() => settings.saveCollectionPath(OTHER_PATH)}
      >
        set path
      </button>
      <button
        type="button"
        onClick={() => settings.saveCollectionPath(undefined)}
      >
        clear path
      </button>
    </div>
  );
}

function renderProbe(store: SettingsStore) {
  return render(
    <SettingsProvider store={store}>
      <PathProbe />
    </SettingsProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe("saveCollectionPath (AC-003 / AC-005)", () => {
  it("should persist the given path to settings.collectionPath so a reload reads it back", async () => {
    const user = userEvent.setup();
    const store = createInMemorySettingsStore();
    renderProbe(store);

    await waitFor(() =>
      expect(screen.getByTestId("path")).toHaveTextContent("none"),
    );
    await user.click(screen.getByRole("button", { name: /set path/i }));

    expect(screen.getByTestId("path")).toHaveTextContent(OTHER_PATH);
    const reloaded = await store.load();
    expect(reloaded.collectionPath).toBe(OTHER_PATH);
  });

  it("should clear collectionPath if called with undefined", async () => {
    const user = userEvent.setup();
    const store = createInMemorySettingsStore({
      ...DEFAULT_SETTINGS,
      collectionPath: CUSTOM_PATH,
    });
    renderProbe(store);

    await waitFor(() =>
      expect(screen.getByTestId("path")).toHaveTextContent(CUSTOM_PATH),
    );
    await user.click(screen.getByRole("button", { name: /clear path/i }));

    expect(screen.getByTestId("path")).toHaveTextContent("none");
    const reloaded = await store.load();
    expect(reloaded.collectionPath).toBeUndefined();
  });
});

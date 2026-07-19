import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SettingsProvider, useSettings } from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsStore,
} from "@/lib/settings/settings";

// toggle-sidebar's registry default is "Mod+B"; every free combo used here
// (Mod+G, Mod+Y) is unused by any action so no conflict logic interferes with
// the raw mutator behavior.
function ShortcutProbe() {
  const { settings, addShortcut, removeShortcut, replaceShortcut, resetShortcut } =
    useSettings();
  const bindings = settings.shortcuts["toggle-sidebar"];

  return (
    <div>
      <span data-testid="binding">
        {bindings === undefined ? "none" : JSON.stringify(bindings)}
      </span>
      <button type="button" onClick={() => addShortcut("toggle-sidebar", "Mod+K")}>
        add
      </button>
      <button type="button" onClick={() => addShortcut("toggle-sidebar", "Mod+G")}>
        add second
      </button>
      <button
        type="button"
        onClick={() => addShortcut("toggle-sidebar", "not a hotkey!!")}
      >
        add invalid
      </button>
      <button
        type="button"
        onClick={() => addShortcut("toggle-sidebar", "Mod+B")}
      >
        add duplicate default
      </button>
      <button
        type="button"
        onClick={() => removeShortcut("toggle-sidebar", "Mod+K")}
      >
        remove added
      </button>
      <button
        type="button"
        onClick={() => removeShortcut("toggle-sidebar", "Mod+B")}
      >
        remove default
      </button>
      <button
        type="button"
        onClick={() => replaceShortcut("toggle-sidebar", "Mod+B", "Mod+Y")}
      >
        replace default
      </button>
      <button
        type="button"
        onClick={() => replaceShortcut("toggle-sidebar", "Mod+B", "Mod+G")}
      >
        replace default with second
      </button>
      <button
        type="button"
        onClick={() => replaceShortcut("toggle-sidebar", "Mod+X", "Mod+Y")}
      >
        replace absent
      </button>
      <button
        type="button"
        onClick={() => replaceShortcut("toggle-sidebar", "Mod+B", "bad!!")}
      >
        replace with invalid
      </button>
      <button type="button" onClick={() => resetShortcut("toggle-sidebar")}>
        reset
      </button>
    </div>
  );
}

function renderProbe(seed: Settings["shortcuts"] = {}) {
  const seeded: Settings = { ...DEFAULT_SETTINGS, shortcuts: seed };
  const inner = createInMemorySettingsStore(seeded);
  const saveSpy = vi.fn(inner.save);
  const store: SettingsStore = { load: inner.load, save: saveSpy };

  render(
    <SettingsProvider store={store}>
      <ShortcutProbe />
    </SettingsProvider>,
  );
  return { saveSpy };
}

afterEach(() => {
  cleanup();
});

describe("SettingsProvider shortcut mutators (AC-006 / TC-016)", () => {
  // AC-006 — behavior: add appends the normalized binding onto the effective
  // list (seeded from the registry default when no override exists yet).
  it("should append the binding onto the effective list if addShortcut is called", async () => {
    const user = userEvent.setup();
    renderProbe();

    await screen.findByTestId("binding");
    expect(screen.getByTestId("binding")).toHaveTextContent("none");

    await user.click(screen.getByRole("button", { name: /^add$/ }));

    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent(
        JSON.stringify(["Mod+B", "Mod+K"]),
      );
    });
  });

  // AC-006 — side-effect-contract: the appended override array is persisted.
  it("should persist the override array via store.save if addShortcut is called", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderProbe();

    await screen.findByTestId("binding");
    await user.click(screen.getByRole("button", { name: /^add$/ }));

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    const persisted = saveSpy.mock.calls.at(-1)![0];
    expect(persisted.shortcuts["toggle-sidebar"]).toEqual(["Mod+B", "Mod+K"]);
  });

  // AC-006, TC-016 — behavior: adding a hotkey already bound is a no-op (no twin).
  it("should not add a duplicate binding if the hotkey is already present", async () => {
    const user = userEvent.setup();
    renderProbe();

    await screen.findByTestId("binding");
    // The default already covers Mod+B, so the add is a no-op: no override written,
    // and in particular no duplicate list like ["Mod+B","Mod+B"].
    await user.click(
      screen.getByRole("button", { name: /add duplicate default/ }),
    );
    await user.click(screen.getByRole("button", { name: /^add$/ }));

    // A subsequent real add lands cleanly onto the (still single-element) list,
    // proving the duplicate add did not double-seed the default.
    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent(
        JSON.stringify(["Mod+B", "Mod+K"]),
      );
    });
  });

  // AC-006 — behavior: an invalid hotkey is rejected (no override written).
  it("should be a no-op if addShortcut is given an invalid hotkey", async () => {
    const user = userEvent.setup();
    renderProbe();

    await screen.findByTestId("binding");
    await user.click(screen.getByRole("button", { name: /add invalid/ }));

    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent("none");
    });
  });

  // AC-006 — behavior: a second add keeps the first binding and appends the new one.
  it("should keep existing bindings if a second addShortcut is called", async () => {
    const user = userEvent.setup();
    renderProbe();

    await screen.findByTestId("binding");
    await user.click(screen.getByRole("button", { name: /^add$/ }));
    await user.click(screen.getByRole("button", { name: /add second/ }));

    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent(
        JSON.stringify(["Mod+B", "Mod+K", "Mod+G"]),
      );
    });
  });

  // AC-006 — behavior: remove drops one binding but keeps the rest.
  it("should remove one binding but keep the rest if removeShortcut is called", async () => {
    const user = userEvent.setup();
    renderProbe();

    await screen.findByTestId("binding");
    await user.click(screen.getByRole("button", { name: /^add$/ }));
    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent(
        JSON.stringify(["Mod+B", "Mod+K"]),
      );
    });

    await user.click(screen.getByRole("button", { name: /remove added/ }));

    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent(
        JSON.stringify(["Mod+B"]),
      );
    });
  });

  // AC-006 — behavior: removing the last binding leaves an empty (disabled) list.
  it("should leave an empty list if the last binding is removed", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderProbe();

    await screen.findByTestId("binding");
    // The only effective binding is the default Mod+B; removing it disables the
    // action, leaving an explicit empty list (distinct from "no override").
    await user.click(screen.getByRole("button", { name: /remove default/ }));

    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent(
        JSON.stringify([]),
      );
    });
    const persisted = saveSpy.mock.calls.at(-1)![0];
    expect(persisted.shortcuts["toggle-sidebar"]).toEqual([]);
  });

  // AC-006 — behavior: replace swaps one binding in place, preserving its slot.
  it("should swap one binding in place if replaceShortcut is called", async () => {
    const user = userEvent.setup();
    renderProbe();

    await screen.findByTestId("binding");
    // Seed a second binding so we can assert the replaced one keeps its slot.
    await user.click(screen.getByRole("button", { name: /add second/ }));
    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent(
        JSON.stringify(["Mod+B", "Mod+G"]),
      );
    });

    await user.click(screen.getByRole("button", { name: /^replace default$/ }));

    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent(
        JSON.stringify(["Mod+Y", "Mod+G"]),
      );
    });
  });

  // AC-006 — behavior: replacing with a combo the action already holds de-dupes.
  it("should de-dupe if replaceShortcut targets a combo the action already holds", async () => {
    const user = userEvent.setup();
    renderProbe();

    await screen.findByTestId("binding");
    await user.click(screen.getByRole("button", { name: /add second/ }));
    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent(
        JSON.stringify(["Mod+B", "Mod+G"]),
      );
    });

    await user.click(
      screen.getByRole("button", { name: /replace default with second/ }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent(
        JSON.stringify(["Mod+G"]),
      );
    });
  });

  // AC-006 — behavior: replacing a binding the action does not hold is a no-op
  // (no override written; the action stays on its default).
  it("should leave bindings untouched if replaceShortcut targets an absent binding", async () => {
    const user = userEvent.setup();
    renderProbe();

    await screen.findByTestId("binding");
    await user.click(screen.getByRole("button", { name: /replace absent/ }));

    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent("none");
    });
  });

  // AC-006 — behavior: replacing with an invalid new hotkey is a no-op.
  it("should be a no-op if replaceShortcut is given an invalid new hotkey", async () => {
    const user = userEvent.setup();
    renderProbe();

    await screen.findByTestId("binding");
    await user.click(
      screen.getByRole("button", { name: /replace with invalid/ }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent("none");
    });
  });

  // AC-006 — behavior: reset deletes the action's override key entirely.
  it("should remove the override entirely if resetShortcut is called", async () => {
    const user = userEvent.setup();
    renderProbe({ "toggle-sidebar": ["Mod+K"] });

    await screen.findByTestId("binding");
    expect(screen.getByTestId("binding")).toHaveTextContent(
      JSON.stringify(["Mod+K"]),
    );

    await user.click(screen.getByRole("button", { name: /reset/ }));

    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent("none");
    });
  });

  // AC-006 — side-effect-contract: the reset drops the key from persisted shortcuts.
  it("should persist the removal of the override key if resetShortcut is called", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderProbe({ "toggle-sidebar": ["Mod+K"] });

    await screen.findByTestId("binding");
    await user.click(screen.getByRole("button", { name: /reset/ }));

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    const persisted = saveSpy.mock.calls.at(-1)![0];
    expect(persisted.shortcuts).not.toHaveProperty("toggle-sidebar");
  });
});

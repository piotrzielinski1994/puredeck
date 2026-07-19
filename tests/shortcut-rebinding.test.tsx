import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { formatForDisplay } from "@tanstack/hotkeys";

import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsStore,
} from "@/lib/settings/settings";
import { ShortcutsSection } from "@/components/settings/shortcuts-section";
import {
  SHORTCUT_ACTIONS,
  type ShortcutOverrides,
} from "@/lib/shortcuts/registry";

// jsdom reports a non-mac platform, so Mod records as Control (learnings).
// Recording Control+Y therefore canonicalizes to the "Mod+Y" override.

function renderSection(overrides: ShortcutOverrides = {}) {
  const seeded: Settings = { ...DEFAULT_SETTINGS, shortcuts: overrides };
  const inner = createInMemorySettingsStore(seeded);
  const saveSpy = vi.fn(inner.save);
  const store: SettingsStore = { load: inner.load, save: saveSpy };

  const result = render(
    <HotkeysProvider>
      <SettingsProvider store={store}>
        <ShortcutsSection />
      </SettingsProvider>
    </HotkeysProvider>,
  );

  return { ...result, saveSpy };
}

const SIDEBAR = SHORTCUT_ACTIONS.find((a) => a.id === "toggle-sidebar")!;
const PALETTE = SHORTCUT_ACTIONS.find((a) => a.id === "open-command-palette")!;

afterEach(() => {
  cleanup();
});

describe("ShortcutsSection (AC-004 / TC-009)", () => {
  // AC-004, TC-009 — behavior
  it("should render a row for every registry action", async () => {
    renderSection();

    for (const action of SHORTCUT_ACTIONS) {
      expect(await screen.findByText(action.name)).toBeInTheDocument();
    }
  });

  // AC-004, TC-009 — behavior: each action shows its effective default binding chip.
  it("should show each action's default binding formatted for display", async () => {
    renderSection();

    expect(
      await screen.findByText(formatForDisplay(SIDEBAR.defaultHotkey)),
    ).toBeInTheDocument();
  });

  // AC-004, TC-009 — behavior: each action offers an Add affordance.
  it("should show an Add button for every action", async () => {
    renderSection();

    for (const action of SHORTCUT_ACTIONS) {
      expect(
        await screen.findByRole("button", {
          name: new RegExp(`add shortcut for ${action.name}`, "i"),
        }),
      ).toBeInTheDocument();
    }
  });

  // AC-004 — behavior: multiple bindings each render as a chip.
  it("should render a chip for every binding if an action has several", async () => {
    renderSection({ "toggle-sidebar": ["Mod+B", "Mod+Y"] });

    expect(
      await screen.findByText(formatForDisplay("Mod+B")),
    ).toBeInTheDocument();
    expect(screen.getByText(formatForDisplay("Mod+Y"))).toBeInTheDocument();
  });
});

describe("ShortcutsSection add (AC-004 / TC-010)", () => {
  // AC-004, TC-010 — side-effect-contract: recording a free combo appends + persists.
  it("should persist an appended binding if a new free combo is recorded", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderSection();

    const addButton = await screen.findByRole("button", {
      name: new RegExp(`add shortcut for ${SIDEBAR.name}`, "i"),
    });
    await user.click(addButton);

    // Mod+Y is unused by any other action -> free.
    await user.keyboard("{Control>}y{/Control}");

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    const persisted = saveSpy.mock.calls.at(-1)![0];
    expect(persisted.shortcuts["toggle-sidebar"]).toEqual(["Mod+B", "Mod+Y"]);
  });

  // AC-004, TC-010 — behavior: the newly recorded binding renders as a chip.
  it("should show the appended binding as a chip after recording", async () => {
    const user = userEvent.setup();
    renderSection();

    const addButton = await screen.findByRole("button", {
      name: new RegExp(`add shortcut for ${SIDEBAR.name}`, "i"),
    });
    await user.click(addButton);
    await user.keyboard("{Control>}y{/Control}");

    expect(
      await screen.findByText(formatForDisplay("Mod+Y")),
    ).toBeInTheDocument();
  });

  // AC-004 — behavior: the Add button becomes Cancel while recording.
  it("should turn the Add button into Cancel while recording", async () => {
    const user = userEvent.setup();
    renderSection();

    const addButton = await screen.findByRole("button", {
      name: new RegExp(`add shortcut for ${SIDEBAR.name}`, "i"),
    });
    await user.click(addButton);

    expect(
      await screen.findByRole("button", { name: /cancel/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Press keys…")).toBeInTheDocument();
  });
});

describe("ShortcutsSection remove/disable (AC-004 / TC-011 / TC-012)", () => {
  // AC-004, TC-011 — side-effect-contract: removing one chip drops just that binding.
  it("should persist the removal of one binding if its × is clicked", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderSection({ "toggle-sidebar": ["Mod+B", "Mod+Y"] });

    const removeButton = await screen.findByRole("button", {
      name: `Remove ${formatForDisplay("Mod+Y")} from ${SIDEBAR.name}`,
    });
    await user.click(removeButton);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    const persisted = saveSpy.mock.calls.at(-1)![0];
    expect(persisted.shortcuts["toggle-sidebar"]).toEqual(["Mod+B"]);
  });

  // AC-004, TC-012 — behavior: removing the last binding disables the action.
  it("should show a disabled state if the last binding is removed", async () => {
    const user = userEvent.setup();
    renderSection({ "toggle-sidebar": ["Mod+B"] });

    const removeButton = await screen.findByRole("button", {
      name: `Remove ${formatForDisplay("Mod+B")} from ${SIDEBAR.name}`,
    });
    await user.click(removeButton);

    expect(await screen.findByText("(disabled)")).toBeInTheDocument();
  });

  // AC-004, TC-012 — side-effect-contract: the disabled state persists as [].
  it("should persist an empty list if the last binding is removed", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderSection({ "toggle-sidebar": ["Mod+B"] });

    const removeButton = await screen.findByRole("button", {
      name: `Remove ${formatForDisplay("Mod+B")} from ${SIDEBAR.name}`,
    });
    await user.click(removeButton);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    const persisted = saveSpy.mock.calls.at(-1)![0];
    expect(persisted.shortcuts["toggle-sidebar"]).toEqual([]);
  });
});

describe("ShortcutsSection reset (AC-004 / TC-013)", () => {
  // AC-004, TC-013 — behavior: Reset is hidden for an action with no override.
  it("should not show a Reset button if the action has no override", async () => {
    renderSection();

    await screen.findByText(SIDEBAR.name);

    expect(
      screen.queryByRole("button", { name: new RegExp(`reset ${SIDEBAR.name}`, "i") }),
    ).not.toBeInTheDocument();
  });

  // AC-004, TC-013 — behavior: Reset is shown once the action has an override.
  it("should show a Reset button if the action has an override", async () => {
    renderSection({ "toggle-sidebar": ["Mod+Y"] });

    expect(
      await screen.findByRole("button", {
        name: new RegExp(`reset ${SIDEBAR.name}`, "i"),
      }),
    ).toBeInTheDocument();
  });

  // AC-004, TC-013 — side-effect-contract: reset drops the override key and the
  // registry default returns.
  it("should remove the override and restore the default if reset is clicked", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderSection({ "toggle-sidebar": ["Mod+Y"] });

    const resetButton = await screen.findByRole("button", {
      name: new RegExp(`reset ${SIDEBAR.name}`, "i"),
    });
    await user.click(resetButton);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    const persisted = saveSpy.mock.calls.at(-1)![0];
    expect(persisted.shortcuts).not.toHaveProperty("toggle-sidebar");

    expect(
      await screen.findByText(formatForDisplay(SIDEBAR.defaultHotkey)),
    ).toBeInTheDocument();
  });
});

describe("ShortcutsSection conflict (AC-005 / TC-014)", () => {
  // AC-005, TC-014 — side-effect-contract: recording a combo owned by another
  // action names the owner and does not persist.
  it("should name the owning action and not persist if a used combo is recorded", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderSection();

    const addButton = await screen.findByRole("button", {
      name: new RegExp(`add shortcut for ${SIDEBAR.name}`, "i"),
    });
    await user.click(addButton);

    // open-command-palette owns Mod+K by default; recording it here conflicts.
    await user.keyboard("{Control>}k{/Control}");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      `${PALETTE.name} already uses that shortcut`,
    );
    expect(saveSpy).not.toHaveBeenCalled();
  });

  // AC-005, TC-014 — behavior: the conflicting combo is not shown as a new chip.
  it("should keep the existing binding chip if a conflicting combo is recorded", async () => {
    const user = userEvent.setup();
    renderSection();

    const addButton = await screen.findByRole("button", {
      name: new RegExp(`add shortcut for ${SIDEBAR.name}`, "i"),
    });
    await user.click(addButton);
    await user.keyboard("{Control>}k{/Control}");

    // The conflict is blocked, so toggle-sidebar still shows only its default.
    expect(
      await screen.findByText(formatForDisplay(SIDEBAR.defaultHotkey)),
    ).toBeInTheDocument();
  });
});

describe("ShortcutsSection edit/replace (AC-004 / AC-006 / TC-015)", () => {
  // behavior: clicking a binding chip arms the recorder in that chip's place.
  it("should turn a binding chip into a recorder if the chip is clicked", async () => {
    const user = userEvent.setup();
    renderSection({ "toggle-sidebar": ["Mod+B"] });

    const chip = await screen.findByRole("button", {
      name: `Edit ${formatForDisplay("Mod+B")} for ${SIDEBAR.name}`,
    });
    await user.click(chip);

    expect(await screen.findByText("Press keys…")).toBeInTheDocument();
    expect(
      screen.queryByText(formatForDisplay("Mod+B")),
    ).not.toBeInTheDocument();
  });

  // AC-006, TC-015 — side-effect-contract: recording a free combo swaps that
  // binding in place, keeping its position among the action's other bindings.
  it("should replace the clicked binding in place if a free combo is recorded", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderSection({ "toggle-sidebar": ["Mod+B", "Mod+G"] });

    const chip = await screen.findByRole("button", {
      name: `Edit ${formatForDisplay("Mod+B")} for ${SIDEBAR.name}`,
    });
    await user.click(chip);

    // Mod+Y is unused by any action -> free.
    await user.keyboard("{Control>}y{/Control}");

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    const persisted = saveSpy.mock.calls.at(-1)![0];
    expect(persisted.shortcuts["toggle-sidebar"]).toEqual(["Mod+Y", "Mod+G"]);
  });

  // AC-006 — behavior: editing to a combo owned by another action is blocked.
  it("should keep the clicked binding and alert if an edit conflicts", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderSection({ "toggle-sidebar": ["Mod+B"] });

    const chip = await screen.findByRole("button", {
      name: `Edit ${formatForDisplay("Mod+B")} for ${SIDEBAR.name}`,
    });
    await user.click(chip);

    // open-command-palette owns Mod+K by default -> conflict.
    await user.keyboard("{Control>}k{/Control}");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(new RegExp(PALETTE.name, "i"));
    expect(saveSpy).not.toHaveBeenCalled();
    expect(screen.getByText(formatForDisplay("Mod+B"))).toBeInTheDocument();
  });

  // behavior: cancelling an edit restores the original chip untouched.
  it("should restore the binding chip if the edit recorder is cancelled", async () => {
    const user = userEvent.setup();
    renderSection({ "toggle-sidebar": ["Mod+B"] });

    const chip = await screen.findByRole("button", {
      name: `Edit ${formatForDisplay("Mod+B")} for ${SIDEBAR.name}`,
    });
    await user.click(chip);
    await screen.findByText("Press keys…");

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(
      await screen.findByRole("button", {
        name: `Edit ${formatForDisplay("Mod+B")} for ${SIDEBAR.name}`,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Press keys…")).not.toBeInTheDocument();
  });
});

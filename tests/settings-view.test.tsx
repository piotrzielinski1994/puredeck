import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  type RenderResult,
} from "@testing-library/react";
import { formatForDisplay } from "@tanstack/hotkeys";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings/settings";
import { ThemeProvider } from "@/lib/theme/theme-context";
import { SettingsView } from "@/components/workspace/settings-view";
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/registry";
import { resolveShortcuts } from "@/lib/shortcuts/resolve";
import type { ShortcutOverrides } from "@/lib/shortcuts/registry";

function renderSettings(overrides: ShortcutOverrides = {}): RenderResult {
  const seeded: Settings = { ...DEFAULT_SETTINGS, shortcuts: overrides };
  return render(
    <SettingsProvider store={createInMemorySettingsStore(seeded)}>
      <ThemeProvider>
        <SettingsView />
      </ThemeProvider>
    </SettingsProvider>,
  );
}

async function openShortcuts(): Promise<void> {
  fireEvent.click(await screen.findByRole("tab", { name: /shortcuts/i }));
}

afterEach(() => {
  cleanup();
});

describe("SettingsView (AC-007 / TC-007)", () => {
  it("should show only the Theme section by default and not the Shortcuts list", async () => {
    renderSettings();

    expect(
      await screen.findByRole("button", { name: /system/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/flip card/i)).not.toBeInTheDocument();
  });

  it("should switch to the Shortcuts section when its sub-tab is clicked", async () => {
    renderSettings();

    await openShortcuts();

    expect(screen.getByText(/flip card/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /system/i }),
    ).not.toBeInTheDocument();
  });

  it("should render Light, Dark, and System mode controls in the Theme section", async () => {
    renderSettings();

    expect(
      await screen.findByRole("button", { name: /light/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /system/i })).toBeInTheDocument();
  });

  it("should mark the current mode as active if the default mode is system", async () => {
    renderSettings();

    const systemControl = await screen.findByRole("button", {
      name: /system/i,
    });

    expect(systemControl).toHaveAttribute("aria-pressed", "true");
  });
});

describe("SettingsView Shortcuts pane is registry-driven (AC-012 / TC-010)", () => {
  it("should render one row per registry action showing its name", async () => {
    renderSettings();

    await openShortcuts();

    SHORTCUT_ACTIONS.forEach((action) => {
      expect(screen.getByText(action.name)).toBeInTheDocument();
    });
  });

  it("should show each action's effective default binding as a display label", async () => {
    renderSettings();

    await openShortcuts();

    const effective = resolveShortcuts({});
    SHORTCUT_ACTIONS.forEach((action) => {
      expect(
        screen.getByText(formatForDisplay(effective[action.id][0])),
      ).toBeInTheDocument();
    });
  });

  it("should show the override's display label if an action is rebound", async () => {
    renderSettings({ "flip-card": ["Enter"] });

    await openShortcuts();

    expect(screen.getByText(formatForDisplay("Enter"))).toBeInTheDocument();
    expect(
      screen.queryByText(formatForDisplay("Space")),
    ).not.toBeInTheDocument();
  });
});

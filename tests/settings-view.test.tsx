import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  type RenderResult,
} from "@testing-library/react";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import { ThemeProvider } from "@/lib/theme/theme-context";
import { SettingsView } from "@/components/workspace/settings-view";

function renderSettings(): RenderResult {
  return render(
    <SettingsProvider store={createInMemorySettingsStore()}>
      <ThemeProvider>
        <SettingsView />
      </ThemeProvider>
    </SettingsProvider>,
  );
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

    fireEvent.click(await screen.findByRole("tab", { name: /shortcuts/i }));

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

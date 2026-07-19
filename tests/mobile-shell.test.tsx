import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
  type RenderResult,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { AppProviders } from "@/app/providers";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings/settings";
import { ThemeProvider } from "@/lib/theme/theme-context";
import { WorkspaceProvider } from "@/components/workspace/workspace-context";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { PaletteProvider, usePalette } from "@/lib/palette/palette-context";
import { DEMO_DECKS } from "@/lib/workspace/demo-data";
import { studyTabId } from "@/lib/workspace/model";

type MediaListener = (event: { matches: boolean }) => void;

function stubMobileMatchMedia() {
  const listeners = new Set<MediaListener>();
  const mql = {
    matches: true,
    media: "(max-width: 767px)",
    onchange: null,
    addEventListener: (_type: string, listener: MediaListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: MediaListener) => {
      listeners.delete(listener);
    },
    addListener: (listener: MediaListener) => listeners.add(listener),
    removeListener: (listener: MediaListener) => listeners.delete(listener),
    dispatchEvent: () => true,
  };
  window.matchMedia = ((query: string) => {
    void query;
    return mql;
  }) as unknown as typeof window.matchMedia;
}

function PaletteStateProbe() {
  const { isOpen } = usePalette();
  return <span data-testid="palette-state">{isOpen ? "open" : "closed"}</span>;
}

function renderMobile(
  settings: Settings = DEFAULT_SETTINGS,
  extra: ReactNode = null,
): RenderResult {
  stubMobileMatchMedia();
  return render(
    <AppProviders>
      <SettingsProvider store={createInMemorySettingsStore(settings)}>
        <ThemeProvider>
          <PaletteProvider>
            <WorkspaceProvider decks={DEMO_DECKS}>
              <WorkspaceLayout />
              {extra}
            </WorkspaceProvider>
          </PaletteProvider>
        </ThemeProvider>
      </SettingsProvider>
    </AppProviders>,
  );
}

afterEach(() => {
  cleanup();
  // @ts-expect-error clean the stub so the global desktop stub is not shadowed.
  delete window.matchMedia;
});

describe("MobileShell drawer (AC-001 / TC-004)", () => {
  it("should show a hamburger and hide the deck list inline until the drawer is opened", async () => {
    renderMobile();

    expect(
      await screen.findByRole("button", { name: /menu/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Spanish")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should reveal the deck list if the hamburger is tapped", async () => {
    const user = userEvent.setup();
    renderMobile();

    await user.click(await screen.findByRole("button", { name: /menu/i }));

    const drawer = await screen.findByRole("dialog");
    expect(within(drawer).getByText("Spanish")).toBeInTheDocument();
    expect(within(drawer).getByText("Capitals")).toBeInTheDocument();
    expect(within(drawer).getByText("Verbs")).toBeInTheDocument();
  });

  it("should close the drawer and open a deck tab if a deck is tapped", async () => {
    const user = userEvent.setup();
    renderMobile();

    await user.click(await screen.findByRole("button", { name: /menu/i }));
    const drawer = await screen.findByRole("dialog");
    await user.click(within(drawer).getByRole("button", { name: "Spanish" }));

    expect(
      await screen.findByRole("tab", { name: /Spanish/ }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

describe("MobileShell command palette button (AC-002 / TC-005)", () => {
  it("should open the shared command palette if the palette button is tapped", async () => {
    const user = userEvent.setup();
    renderMobile(DEFAULT_SETTINGS, <PaletteStateProbe />);

    const paletteButton = await screen.findByRole("button", {
      name: /command palette|palette/i,
    });
    expect(paletteButton).toBeInTheDocument();
    expect(screen.getByTestId("palette-state")).toHaveTextContent("closed");

    await user.click(paletteButton);

    expect(screen.getByTestId("palette-state")).toHaveTextContent("open");
  });
});

describe("MobileShell single mount (AC-006 / TC-008)", () => {
  it("should mount the Main content exactly once in mobile mode", async () => {
    renderMobile();

    await screen.findByRole("button", { name: /menu/i });

    expect(screen.getAllByRole("tablist")).toHaveLength(1);
    expect(screen.getAllByText("No deck open")).toHaveLength(1);
  });
});

describe("MobileShell top-bar touch targets (AC-005 / TC-010)", () => {
  it("should give the hamburger and palette buttons a 44px touch height", async () => {
    renderMobile();

    expect(await screen.findByRole("button", { name: /menu/i })).toHaveClass(
      "min-h-11",
    );
    expect(
      screen.getByRole("button", { name: /command palette|palette/i }),
    ).toHaveClass("min-h-11");
  });
});

describe("MobileShell tab strip scroll (AC-004 / TC-011)", () => {
  it("should let the tab strip scroll horizontally on mobile", async () => {
    const user = userEvent.setup();
    renderMobile();

    await user.click(await screen.findByRole("button", { name: /menu/i }));
    const drawer = await screen.findByRole("dialog");
    await user.click(within(drawer).getByRole("button", { name: "Spanish" }));

    const tablist = await screen.findByRole("tablist");
    expect(tablist).toHaveClass("overflow-x-auto");
  });
});

describe("MobileShell touch targets (AC-005 / TC-009)", () => {
  it("should give mobile sidebar deck rows a min-height touch class", async () => {
    const user = userEvent.setup();
    renderMobile();

    await user.click(await screen.findByRole("button", { name: /menu/i }));
    const drawer = await screen.findByRole("dialog");

    expect(within(drawer).getByRole("button", { name: "Spanish" })).toHaveClass(
      "min-h-11",
    );
  });

  it("should give study grade buttons a min-height touch class", async () => {
    const user = userEvent.setup();
    const studyId = studyTabId("spanish");
    renderMobile({
      ...DEFAULT_SETTINGS,
      openTabIds: [studyId],
      activeTabId: studyId,
    });

    await user.click(await screen.findByRole("button", { name: /flip card/i }));

    expect(screen.getByRole("button", { name: /good/i })).toHaveClass(
      "min-h-11",
    );
  });
});

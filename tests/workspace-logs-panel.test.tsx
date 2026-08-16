import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "@/app/providers";
import { LogsPanel } from "@/components/workspace/logs-panel";
import {
  useLogLines,
  useWorkspace,
  WorkspaceProvider,
} from "@/components/workspace/workspace-context";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { PaletteProvider } from "@/lib/palette/palette-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  type Settings,
  type SettingsStore,
} from "@/lib/settings/settings";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { ThemeProvider } from "@/lib/theme/theme-context";

// F1 - RED: the Logs panel does not exist yet. `@/components/workspace/logs-panel`
// is unresolved and `useLogLines` is not exported from workspace-context, so this
// whole file fails on the missing feature - the intended feature-shaped failure.

const LINES: ReadonlyArray<{ raw: string; level: number }> = [
  {
    raw: "[2026-07-10T12:34:56Z][INFO] google_connect ok email=jane@example.com (34ms)",
    level: 3,
  },
  {
    raw: "[2026-07-10T12:34:56Z][ERROR] google_connect failed (40ms): connection refused",
    level: 5,
  },
  {
    raw: "[2026-07-10T12:34:56Z][INFO] google_disconnect ok (7ms)",
    level: 3,
  },
  {
    raw: "[2026-07-10T12:34:56Z][ERROR] google_access_token failed (5ms): no refresh token",
    level: 5,
  },
  {
    raw: "[2026-07-10T12:34:56Z][WARN] deck failed to save: disk full",
    level: 4,
  },
];

const INFO_LINE = LINES[0];
const ERROR_LINE = LINES[1];

type LogStreamLike = {
  subscribe: (
    onLine: (raw: string, level: number) => void,
  ) => Promise<() => void>;
};

function Seeder() {
  const { appendLogLine } = useLogLines();
  return (
    <button
      type="button"
      onClick={() => {
        for (const line of LINES) {
          appendLogLine(line.raw, line.level);
        }
      }}
    >
      seed logs
    </button>
  );
}

function renderHarness(children: ReactNode, logStream?: LogStreamLike) {
  return render(
    <SettingsProvider store={createInMemorySettingsStore()}>
      <ThemeProvider>
        <WorkspaceProvider decks={[]} logStream={logStream}>
          {children}
        </WorkspaceProvider>
      </ThemeProvider>
    </SettingsProvider>,
  );
}

function renderLogsPanel(logStream?: LogStreamLike) {
  return renderHarness(<LogsPanel />, logStream);
}

function renderShell(
  store: SettingsStore = createInMemorySettingsStore(),
  extra: ReactNode = null,
) {
  return render(
    <AppProviders>
      <SettingsProvider store={store}>
        <ThemeProvider>
          <PaletteProvider>
            <WorkspaceProvider decks={[]}>
              <WorkspaceLayout />
              {extra}
            </WorkspaceProvider>
          </PaletteProvider>
        </ThemeProvider>
      </SettingsProvider>
    </AppProviders>,
  );
}

function panelRegion(): HTMLElement {
  return screen.getByRole("region", { name: /logs/i });
}

function lineTexts(): string[] {
  return within(panelRegion())
    .queryAllByRole("listitem")
    .map((li) => li.textContent ?? "");
}

function getSearchInput(): HTMLInputElement {
  const region = panelRegion();
  const input =
    within(region).queryByRole("searchbox") ??
    within(region).queryByRole("textbox");
  if (!input) {
    throw new Error("Logs search input not found");
  }
  return input as HTMLInputElement;
}

function hasClass(el: Element | null | undefined, cls: string): boolean {
  return el?.className.includes(cls) ?? false;
}

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

const defaultMatchMedia = window.matchMedia;

afterEach(() => {
  cleanup();
  window.matchMedia = defaultMatchMedia;
});

describe("LogLinesContext isolation (AC-010 / TC-012)", () => {
  it("should not re-render a useWorkspace consumer when a log line is appended", async () => {
    const user = userEvent.setup();
    const workspaceRenders = { count: 0 };
    function WorkspaceConsumer() {
      useWorkspace();
      useEffect(() => {
        workspaceRenders.count += 1;
      });
      return null;
    }
    function LogAppender() {
      const { appendLogLine } = useLogLines();
      return (
        <button
          type="button"
          onClick={() => appendLogLine(INFO_LINE.raw, INFO_LINE.level)}
        >
          append log
        </button>
      );
    }
    renderHarness(
      <>
        <WorkspaceConsumer />
        <LogAppender />
      </>,
    );

    const appendButton = await screen.findByRole("button", {
      name: "append log",
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const before = workspaceRenders.count;
    await user.click(appendButton);

    expect(workspaceRenders.count).toBe(before);
  });

  it("should empty the accumulated lines when clearLogLines is called", async () => {
    const user = userEvent.setup();
    function LinesProbe() {
      const { logLines, appendLogLine, clearLogLines } = useLogLines();
      return (
        <div>
          <button
            type="button"
            onClick={() => {
              appendLogLine(INFO_LINE.raw, INFO_LINE.level);
              appendLogLine(ERROR_LINE.raw, ERROR_LINE.level);
            }}
          >
            append two
          </button>
          <button type="button" onClick={clearLogLines}>
            clear logs
          </button>
          <ul>
            {logLines.map((line) => (
              <li key={line.raw}>{line.message}</li>
            ))}
          </ul>
        </div>
      );
    }
    renderHarness(<LinesProbe />);

    await user.click(await screen.findByRole("button", { name: "append two" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "clear logs" }));
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});

describe("Injected log stream wiring (AC-009 / AC-012 / TC-013)", () => {
  it("should render a line pushed through an injected log stream, not a direct append", async () => {
    let emit: ((raw: string, level: number) => void) | null = null;
    const fakeStream: LogStreamLike = {
      subscribe: (onLine) => {
        emit = onLine;
        return Promise.resolve(() => {});
      },
    };
    renderLogsPanel(fakeStream);

    await waitFor(() => expect(emit).not.toBeNull());
    await act(async () => {
      emit?.(ERROR_LINE.raw, ERROR_LINE.level);
    });

    expect(
      lineTexts().some((text) => text.includes("connection refused")),
    ).toBe(true);
    expect(lineTexts()).toHaveLength(1);
  });

  it("should call the captured unsubscribe and ignore later lines if the provider unmounts before subscribe resolves", async () => {
    let capturedOnLine: ((raw: string, level: number) => void) | null = null;
    let resolveSubscribe: ((unsubscribe: () => void) => void) | null = null;
    const unsubscribe = vi.fn();
    const fakeStream: LogStreamLike = {
      subscribe: (onLine) => {
        capturedOnLine = onLine;
        return new Promise((resolve) => {
          resolveSubscribe = resolve;
        });
      },
    };
    const { unmount } = renderLogsPanel(fakeStream);

    await waitFor(() => expect(capturedOnLine).not.toBeNull());
    unmount();
    await act(async () => {
      resolveSubscribe?.(unsubscribe);
    });

    expect(unsubscribe).toHaveBeenCalled();
    expect(() =>
      capturedOnLine?.(ERROR_LINE.raw, ERROR_LINE.level),
    ).not.toThrow();
  });
});

describe("Logs panel render + count + toggle (AC-012 / TC-014)", () => {
  it("should render seeded lines in arrival order newest last with a (n) count, and let the toggle open and close the panel", async () => {
    const user = userEvent.setup();
    renderShell(createInMemorySettingsStore(), <Seeder />);

    await user.click(await screen.findByRole("button", { name: "seed logs" }));

    const toggle = screen.getByRole("button", { name: /^logs/i });
    expect(toggle.textContent).toContain("(5)");

    await user.click(toggle);

    const items = within(panelRegion()).getAllByRole("listitem");
    expect(items[0].textContent).toContain("google_connect ok");
    expect(items.at(-1)?.textContent).toContain("deck failed to save");
    expect(within(panelRegion()).getByRole("list").className).toMatch(
      /overflow/,
    );

    await user.click(toggle);
    await waitFor(() => {
      expect(
        screen.queryByRole("region", { name: /logs/i }),
      ).not.toBeInTheDocument();
    });
  });
});

describe("Logs panel passive append (AC-012 / TC-015)", () => {
  it("should not auto-open the panel or move focus when a line is appended", async () => {
    const user = userEvent.setup();
    renderShell(createInMemorySettingsStore(), <Seeder />);

    const seedButton = await screen.findByRole("button", { name: "seed logs" });
    await user.click(seedButton);

    expect(
      screen.queryByRole("region", { name: /logs/i }),
    ).not.toBeInTheDocument();
    expect(document.activeElement).toBe(seedButton);
  });
});

describe("Logs panel persistence (AC-012 / TC-016)", () => {
  it("should restore the panel open state and keep the persisted size across a remount", async () => {
    const store = createInMemorySettingsStore({
      ...DEFAULT_SETTINGS,
      logsPanelOpen: true,
      logsPanelSize: 40,
    });

    const first = renderShell(store);
    expect(
      await screen.findByRole("region", { name: /logs/i }),
    ).toBeInTheDocument();
    first.unmount();

    const second = renderShell(store);
    expect(
      await screen.findByRole("region", { name: /logs/i }),
    ).toBeInTheDocument();
    expect(store).toBeDefined();
    const reloaded = await store.load();
    expect(reloaded.logsPanelOpen).toBe(true);
    expect(reloaded.logsPanelSize).toBe(40);
    second.unmount();
  });

  it("should persist the panel open state to the store when the toggle is used", async () => {
    const store = createInMemorySettingsStore();
    const saveSpy = vi.spyOn(store, "save");
    const user = userEvent.setup();
    renderShell(store);

    await user.click(await screen.findByRole("button", { name: /logs/i }));

    await waitFor(() => expect(saveSpy).toHaveBeenCalled());
    const savedStates = saveSpy.mock.calls.map((call) => call[0] as Settings);
    expect(savedStates.some((state) => state.logsPanelOpen === true)).toBe(
      true,
    );
  });

  it("should default the panel closed at 30% and merge persisted values for both keys", () => {
    expect(DEFAULT_SETTINGS.logsPanelOpen).toBe(false);
    expect(DEFAULT_SETTINGS.logsPanelSize).toBe(30);

    const merged = mergeSettings(DEFAULT_SETTINGS, {
      logsPanelOpen: true,
      logsPanelSize: 40,
    });
    expect(merged.logsPanelOpen).toBe(true);
    expect(merged.logsPanelSize).toBe(40);
  });
});

describe("Logs panel level coloring (AC-013 / TC-017)", () => {
  it("should render an error line red and a success line not red, with dimmed kv keys and foreground values", async () => {
    const user = userEvent.setup();
    renderHarness(
      <>
        <LogsPanel />
        <Seeder />
      </>,
    );

    await user.click(await screen.findByRole("button", { name: "seed logs" }));

    const items = within(panelRegion()).getAllByRole("listitem");
    const errorItem = items.find((item) =>
      item.textContent?.includes("connection refused"),
    );
    const okItem = items.find((item) =>
      item.textContent?.includes("email=jane@example.com"),
    );

    expect(hasClass(errorItem, "text-destructive")).toBe(true);
    expect(hasClass(okItem, "text-destructive")).toBe(false);
    expect(okItem).toBeDefined();

    const kvKey = within(okItem as HTMLElement).getByText("email=");
    expect(kvKey.className).toContain("text-muted-foreground");
    const valueSpan = kvKey.nextElementSibling;
    expect(valueSpan?.textContent).toBe("jane@example.com");
    expect(valueSpan?.className ?? "").toContain("text-foreground");

    const timestamp = within(okItem as HTMLElement).getByText(
      "2026-07-10T12:34:56Z",
    );
    expect(timestamp.className).toContain("text-muted-foreground");
  });
});

describe("Logs panel search interaction (AC-014 / TC-018)", () => {
  it("should leave only error lines for a level:error query and restore all when cleared", async () => {
    const user = userEvent.setup();
    renderHarness(
      <>
        <LogsPanel />
        <Seeder />
      </>,
    );

    await user.click(await screen.findByRole("button", { name: "seed logs" }));
    expect(lineTexts()).toHaveLength(LINES.length);

    await user.type(getSearchInput(), "level:error");

    const filtered = lineTexts();
    expect(filtered).toHaveLength(2);
    expect(filtered.some((text) => text.includes("connection refused"))).toBe(
      true,
    );
    expect(filtered.some((text) => text.includes("no refresh token"))).toBe(
      true,
    );
    expect(
      filtered.some((text) => text.includes("email=jane@example.com")),
    ).toBe(false);

    await user.clear(getSearchInput());

    expect(lineTexts()).toHaveLength(LINES.length);
  });
});

describe("Logs panel empty, no-match and Clear (AC-015 / TC-019)", () => {
  it("should show the session empty state and no Clear button with no lines", async () => {
    renderLogsPanel();

    expect(
      await screen.findByText("No application logs yet this session."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /clear/i }),
    ).not.toBeInTheDocument();
  });

  it("should show the no-match state when a query filters everything out", async () => {
    const user = userEvent.setup();
    function InfoSeeder() {
      const { appendLogLine } = useLogLines();
      return (
        <button
          type="button"
          onClick={() => appendLogLine(INFO_LINE.raw, INFO_LINE.level)}
        >
          seed info
        </button>
      );
    }
    renderHarness(
      <>
        <LogsPanel />
        <InfoSeeder />
      </>,
    );

    await user.click(await screen.findByRole("button", { name: "seed info" }));
    await user.type(getSearchInput(), "level:error");

    expect(screen.getByText("No matching log lines.")).toBeInTheDocument();
  });

  it("should empty the list and hide Clear when Clear is pressed", async () => {
    const user = userEvent.setup();
    renderHarness(
      <>
        <LogsPanel />
        <Seeder />
      </>,
    );

    await user.click(await screen.findByRole("button", { name: "seed logs" }));
    expect(lineTexts()).toHaveLength(LINES.length);
    const clear = screen.getByRole("button", { name: /clear/i });

    await user.click(clear);

    expect(lineTexts()).toEqual([]);
    expect(
      screen.queryByRole("button", { name: /clear/i }),
    ).not.toBeInTheDocument();
  });
});

describe("Logs panel mobile touch access (AC-017 / TC-020)", () => {
  it("should open the full-height Logs from a 44px top-bar touch button with pointer-usable search and Clear", async () => {
    stubMobileMatchMedia();
    const user = userEvent.setup();
    renderShell(createInMemorySettingsStore(), <Seeder />);

    const touchToggle = (
      await screen.findAllByRole("button", { name: /logs/i })
    ).find((button) => button.className.includes("min-h-11"));
    if (!touchToggle) {
      throw new Error("mobile Logs toggle not found");
    }
    expect(touchToggle).toHaveClass("min-h-11");
    await user.click(touchToggle);

    const panel = panelRegion();
    const search = getSearchInput();
    expect(search.getAttribute("autocapitalize")).toBe("off");
    expect(search.getAttribute("autocorrect")).toBe("off");
    expect(search.getAttribute("autocomplete")).toBe("off");

    await user.type(search, "level:error");
    await user.clear(search);
    expect(within(panel).getByRole("list")).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "seed logs" }));
    const clear = within(panel).getByRole("button", { name: /clear/i });
    await user.click(clear);
    expect(lineTexts()).toEqual([]);
  });
});

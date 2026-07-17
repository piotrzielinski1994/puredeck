import { afterEach, describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import { DEFAULT_SETTINGS, type ThemeMode } from "@/lib/settings/settings";
import { ThemeProvider, useTheme } from "@/lib/theme/theme-context";

type MediaListener = (event: { matches: boolean }) => void;

function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<MediaListener>();
  const mql = {
    matches: initialMatches,
    media: "(prefers-color-scheme: dark)",
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

  return {
    setPrefersDark(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((listener) => listener({ matches }));
    },
  };
}

function ThemeProbe() {
  const { mode, setMode } = useTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button type="button" onClick={() => setMode("light")}>
        light
      </button>
      <button type="button" onClick={() => setMode("dark")}>
        dark
      </button>
      <button type="button" onClick={() => setMode("system")}>
        system
      </button>
    </div>
  );
}

function renderTheme(mode: ThemeMode) {
  const store = createInMemorySettingsStore({
    ...DEFAULT_SETTINGS,
    theme: { ...DEFAULT_SETTINGS.theme, mode },
  });

  return render(
    <SettingsProvider store={store}>
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    </SettingsProvider>,
  );
}

afterEach(() => {
  document.documentElement.classList.remove("dark");
  // @ts-expect-error clean the stub so a later test re-stubs from scratch.
  delete window.matchMedia;
});

describe("ThemeProvider dark-class side effect (AC-008 / TC-008)", () => {
  it("should add the dark class to documentElement if mode is set to dark", async () => {
    const user = userEvent.setup();
    stubMatchMedia(false);

    renderTheme("light");

    const darkButton = await screen.findByRole("button", { name: "dark" });
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    await user.click(darkButton);

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("should remove the dark class if mode is set to light", async () => {
    const user = userEvent.setup();
    stubMatchMedia(false);
    document.documentElement.classList.add("dark");

    renderTheme("dark");

    const lightButton = await screen.findByRole("button", { name: "light" });
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    await user.click(lightButton);

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });
});

describe("ThemeProvider system mode (AC-008 / TC-009)", () => {
  it("should follow the OS preference if mode is system and the OS prefers dark", async () => {
    stubMatchMedia(true);

    renderTheme("system");

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("should not add the dark class if mode is system and the OS prefers light", async () => {
    stubMatchMedia(false);

    renderTheme("system");

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  it("should react to an OS preference change if in system mode", async () => {
    const media = stubMatchMedia(false);

    renderTheme("system");

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    act(() => {
      media.setPrefersDark(true);
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    act(() => {
      media.setPrefersDark(false);
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });
});

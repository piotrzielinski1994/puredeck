import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  type RenderResult,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import { DEFAULT_SETTINGS } from "@/lib/settings/settings";
import { ThemeProvider } from "@/lib/theme/theme-context";
import { StorageSection } from "@/components/settings/storage-section";
import { SettingsView } from "@/components/workspace/settings-view";

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  isMobile: false,
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: mocks.open }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => true }));
vi.mock("@/lib/responsive/use-is-mobile", () => ({
  useIsMobile: () => mocks.isMobile,
}));

const CUSTOM_PATH = "/Users/me/Decks";
const PICKED_PATH = "/Users/me/Picked";

function renderStorage(collectionPath?: string): RenderResult {
  const store = createInMemorySettingsStore({
    ...DEFAULT_SETTINGS,
    collectionPath,
  });
  return render(
    <SettingsProvider store={store}>
      <ThemeProvider>
        <StorageSection />
      </ThemeProvider>
    </SettingsProvider>,
  );
}

const chooseButton = () => screen.queryByRole("button", { name: /choose folder/i });
const resetButton = () =>
  screen.queryByRole("button", { name: /reset to default/i });

beforeEach(() => {
  mocks.open.mockReset();
  mocks.isMobile = false;
});

afterEach(() => {
  cleanup();
});

describe("Settings Storage sub-tab (AC-001 / TC-001)", () => {
  it("should reveal the Storage section when its sub-tab is clicked", async () => {
    const user = userEvent.setup();
    render(
      <SettingsProvider store={createInMemorySettingsStore()}>
        <ThemeProvider>
          <SettingsView />
        </ThemeProvider>
      </SettingsProvider>,
    );

    await user.click(await screen.findByRole("tab", { name: /storage/i }));

    expect(screen.getByText(/default app data folder/i)).toBeInTheDocument();
  });
});

describe("StorageSection path label (AC-002 / TC-001)", () => {
  it("should show the default app data folder label if no custom path is set", async () => {
    renderStorage();

    expect(
      await screen.findByText(/default app data folder/i),
    ).toBeInTheDocument();
  });

  it("should show the absolute path if a custom collectionPath is set", async () => {
    renderStorage(CUSTOM_PATH);

    expect(await screen.findByText(CUSTOM_PATH)).toBeInTheDocument();
    expect(screen.queryByText(/default app data folder/i)).not.toBeInTheDocument();
  });
});

describe("StorageSection choose folder (AC-003 / TC-002)", () => {
  it("should open a single-select directory picker when Choose folder is clicked", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue(PICKED_PATH);
    renderStorage();

    await user.click(await screen.findByRole("button", { name: /choose folder/i }));

    expect(mocks.open).toHaveBeenCalledWith({
      directory: true,
      multiple: false,
    });
  });

  it("should save the picked absolute path so the label updates in place", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue(PICKED_PATH);
    renderStorage();

    await user.click(await screen.findByRole("button", { name: /choose folder/i }));

    expect(await screen.findByText(PICKED_PATH)).toBeInTheDocument();
    expect(resetButton()).toBeInTheDocument();
  });
});

describe("StorageSection cancel (AC-004 / TC-004)", () => {
  it("should leave the path unchanged if the picker returns null", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue(null);
    renderStorage();

    await user.click(await screen.findByRole("button", { name: /choose folder/i }));

    await waitFor(() => expect(mocks.open).toHaveBeenCalled());
    expect(screen.getByText(/default app data folder/i)).toBeInTheDocument();
    expect(resetButton()).not.toBeInTheDocument();
  });

  it("should ignore an array result from a multi-select (E-3)", async () => {
    const user = userEvent.setup();
    mocks.open.mockResolvedValue([PICKED_PATH]);
    renderStorage();

    await user.click(await screen.findByRole("button", { name: /choose folder/i }));

    await waitFor(() => expect(mocks.open).toHaveBeenCalled());
    expect(screen.getByText(/default app data folder/i)).toBeInTheDocument();
    expect(screen.queryByText(PICKED_PATH)).not.toBeInTheDocument();
  });
});

describe("StorageSection reset (AC-005 / TC-005 / TC-006)", () => {
  it("should not render Reset to default if no custom path is set", async () => {
    renderStorage();

    await screen.findByRole("button", { name: /choose folder/i });
    expect(resetButton()).not.toBeInTheDocument();
  });

  it("should render Reset to default and clear the path when a custom path is set", async () => {
    const user = userEvent.setup();
    renderStorage(CUSTOM_PATH);

    const reset = await screen.findByRole("button", {
      name: /reset to default/i,
    });
    await user.click(reset);

    expect(
      await screen.findByText(/default app data folder/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(CUSTOM_PATH)).not.toBeInTheDocument();
  });
});

describe("StorageSection mobile (AC-009 / TC-009 / E-7)", () => {
  it("should show a read-only path and desktop-only note with no controls on mobile", async () => {
    mocks.isMobile = true;
    renderStorage(CUSTOM_PATH);

    expect(await screen.findByText(CUSTOM_PATH)).toBeInTheDocument();
    expect(screen.getByText(/desktop-only/i)).toBeInTheDocument();
    expect(chooseButton()).not.toBeInTheDocument();
    expect(resetButton()).not.toBeInTheDocument();
  });

  it("should never call the folder picker on mobile", async () => {
    mocks.isMobile = true;
    renderStorage();

    await screen.findByText(/desktop-only/i);
    expect(mocks.open).not.toHaveBeenCalled();
  });
});

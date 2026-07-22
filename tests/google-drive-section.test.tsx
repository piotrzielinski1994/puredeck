import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleDriveSection } from "@/components/settings/google-drive-section";
import { StorageSection } from "@/components/settings/storage-section";
import type { GoogleAuth } from "@/lib/google/google-auth";
import { createInMemoryGoogleAuth } from "@/lib/google/in-memory-google-auth";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsStore,
} from "@/lib/settings/settings";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { ThemeProvider } from "@/lib/theme/theme-context";

const mocks = vi.hoisted(() => ({ open: vi.fn(), isMobile: false }));

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: mocks.open }));
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => false,
  invoke: vi.fn(),
}));
vi.mock("@pziel/pureui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pziel/pureui")>()),
  useIsMobile: () => mocks.isMobile,
}));

const EMAIL = "jane@example.com";

function makeStore(googleAccount?: { email: string }): SettingsStore {
  return createInMemorySettingsStore({
    ...DEFAULT_SETTINGS,
    ...(googleAccount ? { googleAccount } : {}),
  } as Settings);
}

function renderSection(auth: GoogleAuth, store: SettingsStore) {
  render(
    <SettingsProvider store={store}>
      <ThemeProvider>
        <GoogleDriveSection auth={auth} />
      </ThemeProvider>
    </SettingsProvider>,
  );
}

const connectButton = () =>
  screen.queryByRole("button", { name: /connect google drive/i });
const disconnectButton = () =>
  screen.queryByRole("button", { name: /disconnect/i });

beforeEach(() => {
  mocks.open.mockReset();
  mocks.isMobile = false;
});

afterEach(() => {
  cleanup();
});

describe("GoogleDriveSection under Storage (AC-001)", () => {
  it("should render a Google Drive subsection inside the Storage section", async () => {
    render(
      <SettingsProvider store={createInMemorySettingsStore()}>
        <ThemeProvider>
          <StorageSection />
        </ThemeProvider>
      </SettingsProvider>,
    );

    expect(await screen.findByText("Google Drive")).toBeInTheDocument();
    expect(screen.getByText(/default app data folder/i)).toBeInTheDocument();
  });
});

describe("GoogleDriveSection disconnected (AC-002)", () => {
  it("should show Not connected and a Connect button with no email if disconnected", async () => {
    renderSection(createInMemoryGoogleAuth({ account: null }), makeStore());

    expect(await screen.findByText(/not connected/i)).toBeInTheDocument();
    expect(connectButton()).toBeInTheDocument();
    expect(disconnectButton()).not.toBeInTheDocument();
    expect(screen.queryByText(EMAIL)).not.toBeInTheDocument();
  });
});

describe("GoogleDriveSection connect success (AC-003 / AC-004)", () => {
  it("should show Connected as <email> with Disconnect and persist googleAccount if connect resolves ok", async () => {
    const user = userEvent.setup();
    const store = makeStore();
    const auth = createInMemoryGoogleAuth({
      account: null,
      onConnect: () => ({ ok: true, account: { email: EMAIL } }),
    });
    renderSection(auth, store);

    await user.click(
      await screen.findByRole("button", { name: /connect google drive/i }),
    );

    expect(
      await screen.findByText(new RegExp(`connected as ${EMAIL}`, "i")),
    ).toBeInTheDocument();
    expect(disconnectButton()).toBeInTheDocument();
    expect(connectButton()).not.toBeInTheDocument();
    expect((await store.load()).googleAccount).toEqual({ email: EMAIL });
  });
});

describe("GoogleDriveSection disconnect (AC-005)", () => {
  it("should return to Not connected and clear the cache if Disconnect is clicked", async () => {
    const user = userEvent.setup();
    const store = makeStore({ email: EMAIL });
    const auth = createInMemoryGoogleAuth({ account: { email: EMAIL } });
    renderSection(auth, store);

    await user.click(
      await screen.findByRole("button", { name: /disconnect/i }),
    );

    expect(await screen.findByText(/not connected/i)).toBeInTheDocument();
    expect(connectButton()).toBeInTheDocument();
    expect((await store.load()).googleAccount).toBeUndefined();
  });
});

describe("GoogleDriveSection restore on mount (AC-006)", () => {
  it("should show Connected as <email> with no click if a cached account and status agree", async () => {
    renderSection(
      createInMemoryGoogleAuth({ account: { email: EMAIL } }),
      makeStore({ email: EMAIL }),
    );

    expect(
      await screen.findByText(new RegExp(`connected as ${EMAIL}`, "i")),
    ).toBeInTheDocument();
    expect(disconnectButton()).toBeInTheDocument();
    expect(connectButton()).not.toBeInTheDocument();
  });

  it("should cache the account once if status finds a connection while the cache is empty", async () => {
    const store = makeStore();
    renderSection(
      createInMemoryGoogleAuth({ account: { email: EMAIL } }),
      store,
    );

    await screen.findByText(new RegExp(`connected as ${EMAIL}`, "i"));

    expect((await store.load()).googleAccount).toEqual({ email: EMAIL });
  });

  it("should not re-query status in a loop if the connected account object identity changes each call", async () => {
    let statusCalls = 0;
    const freshEachCall: GoogleAuth = {
      status: () => {
        statusCalls += 1;
        return Promise.resolve({ email: EMAIL });
      },
      connect: () => Promise.resolve({ ok: true, account: { email: EMAIL } }),
      disconnect: () => Promise.resolve(),
    };
    renderSection(freshEachCall, makeStore({ email: EMAIL }));

    await screen.findByText(new RegExp(`connected as ${EMAIL}`, "i"));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(statusCalls).toBe(1);
  });
});

describe("GoogleDriveSection stale-cache reconcile (E-4)", () => {
  it("should reconcile to disconnected and clear the cache if status is null while a cache is set", async () => {
    const store = makeStore({ email: EMAIL });
    renderSection(createInMemoryGoogleAuth({ account: null }), store);

    expect(await screen.findByText(/not connected/i)).toBeInTheDocument();
    expect(connectButton()).toBeInTheDocument();
    await waitFor(async () =>
      expect((await store.load()).googleAccount).toBeUndefined(),
    );
  });
});

describe("GoogleDriveSection connect failure (AC-007)", () => {
  it("should show an inline error and stay disconnected with an unchanged cache if connect fails", async () => {
    const user = userEvent.setup();
    const store = makeStore();
    const auth = createInMemoryGoogleAuth({
      account: null,
      onConnect: () => ({ ok: false, reason: "failed" }),
    });
    renderSection(auth, store);

    await user.click(
      await screen.findByRole("button", { name: /connect google drive/i }),
    );

    expect(await screen.findByText(/couldn't connect/i)).toBeInTheDocument();
    expect(screen.getByText(/not connected/i)).toBeInTheDocument();
    expect(connectButton()).toBeInTheDocument();
    expect((await store.load()).googleAccount).toBeUndefined();
  });
});

describe("GoogleDriveSection unconfigured (AC-011)", () => {
  it("should show an isn't-configured message if connect fails with reason unconfigured", async () => {
    const user = userEvent.setup();
    const auth = createInMemoryGoogleAuth({
      account: null,
      onConnect: () => ({ ok: false, reason: "unconfigured" }),
    });
    renderSection(auth, makeStore());

    await user.click(
      await screen.findByRole("button", { name: /connect google drive/i }),
    );

    expect(await screen.findByText(/isn't configured/i)).toBeInTheDocument();
    expect(connectButton()).toBeInTheDocument();
  });
});

describe("GoogleDriveSection secret hygiene (AC-009 frontend)", () => {
  it("should persist a googleAccount holding only an email key after a successful connect", async () => {
    const user = userEvent.setup();
    const store = makeStore();
    const auth = createInMemoryGoogleAuth({
      account: null,
      onConnect: () => ({ ok: true, account: { email: EMAIL } }),
    });
    renderSection(auth, store);

    await user.click(
      await screen.findByRole("button", { name: /connect google drive/i }),
    );

    await screen.findByText(new RegExp(`connected as ${EMAIL}`, "i"));
    const persisted = (await store.load()).googleAccount;
    expect(persisted).toBeDefined();
    expect(Object.keys(persisted ?? {})).toEqual(["email"]);
  });
});

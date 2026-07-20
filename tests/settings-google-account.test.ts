import { afterEach, describe, expect, it } from "vitest";
import { createElement, type ReactNode } from "react";
import { cleanup, renderHook, act, waitFor } from "@testing-library/react";
import {
  SettingsProvider,
  useSettings,
} from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  type Settings,
  type SettingsStore,
} from "@/lib/settings/settings";

const ACCOUNT = { email: "jane@example.com" };

function wrapper(store: SettingsStore) {
  return ({ children }: { children: ReactNode }) =>
    createElement(SettingsProvider, { store, children });
}

function mountSettings(store: SettingsStore) {
  return renderHook(() => useSettings(), { wrapper: wrapper(store) });
}

afterEach(() => {
  cleanup();
});

describe("saveGoogleAccount (AC-003 / AC-005)", () => {
  it("should persist googleAccount if given an account so a reload reads it back", async () => {
    const store = createInMemorySettingsStore();
    const { result } = mountSettings(store);

    await waitFor(() => expect(result.current).not.toBeNull());
    act(() => result.current.saveGoogleAccount(ACCOUNT));

    expect(result.current.settings.googleAccount).toEqual(ACCOUNT);
    const reloaded = await store.load();
    expect(reloaded.googleAccount).toEqual(ACCOUNT);
  });

  it("should clear googleAccount if called with undefined", async () => {
    const store = createInMemorySettingsStore({
      ...DEFAULT_SETTINGS,
      googleAccount: ACCOUNT,
    } as Settings);
    const { result } = mountSettings(store);

    await waitFor(() =>
      expect(result.current?.settings.googleAccount).toEqual(ACCOUNT),
    );
    act(() => result.current.saveGoogleAccount(undefined));

    expect(result.current.settings.googleAccount).toBeUndefined();
    const reloaded = await store.load();
    expect(reloaded.googleAccount).toBeUndefined();
  });
});

describe("mergeSettings googleAccount (AC-006)", () => {
  it("should keep a valid {email:string} googleAccount and drop malformed ones", () => {
    expect(
      mergeSettings(DEFAULT_SETTINGS, { googleAccount: ACCOUNT }).googleAccount,
    ).toEqual(ACCOUNT);

    const malformed: unknown[] = [
      {},
      { email: "" },
      { email: 123 },
      { email: null },
      "nope",
      42,
    ];
    malformed.forEach((googleAccount) => {
      expect(
        mergeSettings(DEFAULT_SETTINGS, { googleAccount }).googleAccount,
      ).toBeUndefined();
    });
  });
});

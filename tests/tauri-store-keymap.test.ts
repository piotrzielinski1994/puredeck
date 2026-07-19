import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FileState = Record<string, Record<string, unknown>>;

const files: FileState = {};

vi.mock("@tauri-apps/plugin-store", () => {
  class LazyStore {
    constructor(private readonly file: string) {
      files[this.file] ??= {};
    }
    get<T>(key: string): Promise<T | undefined> {
      return Promise.resolve(files[this.file][key] as T | undefined);
    }
    set(key: string, value: unknown): Promise<void> {
      files[this.file][key] = value;
      return Promise.resolve();
    }
    save(): Promise<void> {
      return Promise.resolve();
    }
  }
  return { LazyStore };
});

beforeEach(() => {
  for (const key of Object.keys(files)) {
    delete files[key];
  }
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("createTauriSettingsStore keymap split (AC-009)", () => {
  it("should write shortcuts to keymap.json and the rest to settings.json", async () => {
    const { createTauriSettingsStore } = await import(
      "@/lib/settings/tauri-store"
    );
    const { DEFAULT_SETTINGS } = await import("@/lib/settings/settings");
    const store = createTauriSettingsStore();

    await store.save({
      ...DEFAULT_SETTINGS,
      sidebarCollapsed: true,
      shortcuts: { "flip-card": ["Enter"] },
    });

    expect(files["keymap.json"].shortcuts).toEqual({ "flip-card": ["Enter"] });
    expect(files["settings.json"].settings).not.toHaveProperty("shortcuts");
    expect(
      (files["settings.json"].settings as { sidebarCollapsed: boolean })
        .sidebarCollapsed,
    ).toBe(true);
  });

  it("should re-merge shortcuts from keymap.json back into the loaded Settings", async () => {
    const { createTauriSettingsStore } = await import(
      "@/lib/settings/tauri-store"
    );
    const { DEFAULT_SETTINGS } = await import("@/lib/settings/settings");
    const store = createTauriSettingsStore();

    await store.save({
      ...DEFAULT_SETTINGS,
      shortcuts: { "flip-card": ["Enter"] },
    });
    const loaded = await store.load();

    expect(loaded.shortcuts).toEqual({ "flip-card": ["Enter"] });
  });
});

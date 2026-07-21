import { isTauri } from "@tauri-apps/api/core";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import type { SettingsStore } from "@/lib/settings/settings";
import { createTauriSettingsStore } from "@/lib/settings/tauri-store";

export function createSettingsStore(): SettingsStore {
  return isTauri() ? createTauriSettingsStore() : createInMemorySettingsStore();
}

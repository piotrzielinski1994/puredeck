import { isTauri } from "@tauri-apps/api/core";
import type { GoogleAuth } from "@/lib/google/google-auth";
import { createInMemoryGoogleAuth } from "@/lib/google/in-memory-google-auth";
import { createTauriGoogleAuth } from "@/lib/google/tauri-google-auth";

export function createGoogleAuth(): GoogleAuth {
  return isTauri() ? createTauriGoogleAuth() : createInMemoryGoogleAuth();
}

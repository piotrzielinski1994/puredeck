import { invoke } from "@tauri-apps/api/core";
import type {
  ConnectResult,
  GoogleAccount,
  GoogleAuth,
} from "@/lib/google/google-auth";

function connectReason(error: unknown): "unconfigured" | "failed" {
  return String(error).includes("unconfigured") ? "unconfigured" : "failed";
}

export function createTauriGoogleAuth(): GoogleAuth {
  return {
    status: () => invoke<GoogleAccount | null>("google_status"),
    connect: () =>
      invoke<GoogleAccount>("google_connect")
        .then<ConnectResult>((account) => ({ ok: true, account }))
        .catch<ConnectResult>((error) => ({
          ok: false,
          reason: connectReason(error),
        })),
    disconnect: () => invoke<void>("google_disconnect"),
  };
}

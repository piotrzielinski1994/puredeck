export type GoogleAccount = { email: string };

export type ConnectResult =
  | { ok: true; account: GoogleAccount }
  | { ok: false; reason: "unconfigured" | "failed" };

export type GoogleAuth = {
  status: () => Promise<GoogleAccount | null>;
  connect: () => Promise<ConnectResult>;
  disconnect: () => Promise<void>;
};

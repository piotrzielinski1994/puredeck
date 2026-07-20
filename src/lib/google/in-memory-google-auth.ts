import type {
  ConnectResult,
  GoogleAccount,
  GoogleAuth,
} from "@/lib/google/google-auth";

const DEMO_ACCOUNT: GoogleAccount = { email: "demo@example.com" };

export function createInMemoryGoogleAuth(opts?: {
  account?: GoogleAccount | null;
  onConnect?: () => ConnectResult;
}): GoogleAuth {
  let account: GoogleAccount | null = opts?.account ?? null;
  const onConnect =
    opts?.onConnect ?? (() => ({ ok: true, account: DEMO_ACCOUNT }));

  return {
    status: () => Promise.resolve(account),
    connect: () => {
      const result = onConnect();
      if (result.ok) {
        account = result.account;
      }
      return Promise.resolve(result);
    },
    disconnect: () => {
      account = null;
      return Promise.resolve();
    },
  };
}

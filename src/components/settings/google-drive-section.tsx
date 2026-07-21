import { useEffect, useRef, useState } from "react";
import type { GoogleAccount, GoogleAuth } from "@/lib/google/google-auth";
import { createGoogleAuth } from "@/lib/google/google-auth-factory";
import { useSettings } from "@/lib/settings/settings-context";
import { cn } from "@/lib/utils";

type ConnectError = "failed" | "unconfigured";

const ERROR_MESSAGE: Record<ConnectError, string> = {
  failed: "Couldn't connect to Google - try again.",
  unconfigured: "Google sign-in isn't configured.",
};

export function GoogleDriveSection({ auth }: { auth?: GoogleAuth }) {
  const [client] = useState<GoogleAuth>(() => auth ?? createGoogleAuth());
  const { settings, saveGoogleAccount } = useSettings();
  const [account, setAccount] = useState<GoogleAccount | null>(
    settings.googleAccount ?? null,
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<ConnectError | null>(null);

  const reconcileRef = useRef<{
    cachedEmail: string | undefined;
    saveGoogleAccount: typeof saveGoogleAccount;
  }>({ cachedEmail: settings.googleAccount?.email, saveGoogleAccount });
  useEffect(() => {
    reconcileRef.current = {
      cachedEmail: settings.googleAccount?.email,
      saveGoogleAccount,
    };
  }, [settings.googleAccount?.email, saveGoogleAccount]);

  useEffect(() => {
    let isMounted = true;
    client.status().then((status) => {
      if (!isMounted) {
        return;
      }
      setAccount(status);
      const { cachedEmail, saveGoogleAccount: save } = reconcileRef.current;
      if (status === null && cachedEmail !== undefined) {
        save(undefined);
        return;
      }
      if (status !== null && status.email !== cachedEmail) {
        save(status);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [client]);

  const connect = async (): Promise<void> => {
    setError(null);
    setIsConnecting(true);
    const result = await client.connect();
    setIsConnecting(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setAccount(result.account);
    saveGoogleAccount(result.account);
  };

  const disconnect = async (): Promise<void> => {
    await client.disconnect();
    setAccount(null);
    saveGoogleAccount(undefined);
  };

  return (
    <section className="mt-6 flex flex-col gap-1">
      <span className="text-sm font-medium">Google Drive</span>
      {account ? (
        <>
          <p className="text-sm text-muted-foreground">
            Connected as {account.email}
          </p>
          <div className="mt-1 flex">
            <button
              type="button"
              onClick={disconnect}
              className="border px-4 py-1.5 text-sm hover:bg-accent"
            >
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Not connected.</p>
          {error && (
            <p className="text-sm text-destructive">{ERROR_MESSAGE[error]}</p>
          )}
          <div className="mt-1 flex">
            <button
              type="button"
              onClick={connect}
              disabled={isConnecting}
              className={cn(
                "border px-4 py-1.5 text-sm hover:bg-accent",
                "bg-primary text-primary-foreground hover:brightness-90",
                isConnecting && "opacity-60",
              )}
            >
              {isConnecting ? "Connecting..." : "Connect Google Drive"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

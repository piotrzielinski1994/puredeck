import { afterEach, describe, expect, it, vi } from "vitest";
import { createTauriGoogleAuth } from "@/lib/google/tauri-google-auth";

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
  isTauri: () => true,
}));

const EMAIL = "jane@example.com";

afterEach(() => {
  mocks.invoke.mockReset();
});

describe("createTauriGoogleAuth status (Task 5)", () => {
  it("should invoke google_status and map an {email} result to a GoogleAccount", async () => {
    mocks.invoke.mockResolvedValue({ email: EMAIL });
    const auth = createTauriGoogleAuth();

    const account = await auth.status();

    expect(mocks.invoke).toHaveBeenCalledWith("google_status");
    expect(account).toEqual({ email: EMAIL });
  });

  it("should map a null google_status result to null (disconnected)", async () => {
    mocks.invoke.mockResolvedValue(null);
    const auth = createTauriGoogleAuth();

    expect(await auth.status()).toBeNull();
  });
});

describe("createTauriGoogleAuth connect (Task 5 / AC-003 / AC-007 / AC-011)", () => {
  it("should return ok with the account if google_connect resolves an {email}", async () => {
    mocks.invoke.mockResolvedValue({ email: EMAIL });
    const auth = createTauriGoogleAuth();

    const result = await auth.connect();

    expect(mocks.invoke).toHaveBeenCalledWith("google_connect");
    expect(result).toEqual({ ok: true, account: { email: EMAIL } });
  });

  it("should return reason unconfigured if google_connect rejects with an unconfigured error", async () => {
    mocks.invoke.mockRejectedValue("unconfigured");
    const auth = createTauriGoogleAuth();

    expect(await auth.connect()).toEqual({ ok: false, reason: "unconfigured" });
  });

  it("should return reason failed if google_connect rejects with any other error", async () => {
    mocks.invoke.mockRejectedValue("network exploded");
    const auth = createTauriGoogleAuth();

    expect(await auth.connect()).toEqual({ ok: false, reason: "failed" });
  });
});

describe("createTauriGoogleAuth disconnect (Task 5 / AC-005)", () => {
  it("should invoke google_disconnect", async () => {
    mocks.invoke.mockResolvedValue(undefined);
    const auth = createTauriGoogleAuth();

    await auth.disconnect();

    expect(mocks.invoke).toHaveBeenCalledWith("google_disconnect");
  });
});

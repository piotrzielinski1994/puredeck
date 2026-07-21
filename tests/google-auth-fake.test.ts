import { describe, expect, it, vi } from "vitest";
import { createGoogleAuth } from "@/lib/google/google-auth-factory";
import { createInMemoryGoogleAuth } from "@/lib/google/in-memory-google-auth";

vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => false }));

const ACCOUNT = { email: "jane@example.com" };

describe("createInMemoryGoogleAuth status (Task 2)", () => {
  it("should start disconnected if no initial account is given", async () => {
    const auth = createInMemoryGoogleAuth();

    expect(await auth.status()).toBeNull();
  });

  it("should start connected if an initial account is given", async () => {
    const auth = createInMemoryGoogleAuth({ account: ACCOUNT });

    expect(await auth.status()).toEqual(ACCOUNT);
  });
});

describe("createInMemoryGoogleAuth connect (Task 2)", () => {
  it("should flip status to the account and return ok if connect resolves ok", async () => {
    const auth = createInMemoryGoogleAuth({
      onConnect: () => ({ ok: true, account: ACCOUNT }),
    });

    const result = await auth.connect();

    expect(result).toEqual({ ok: true, account: ACCOUNT });
    expect(await auth.status()).toEqual(ACCOUNT);
  });

  it("should leave status null and return the failure if connect is scripted ok:false", async () => {
    const auth = createInMemoryGoogleAuth({
      onConnect: () => ({ ok: false, reason: "failed" }),
    });

    const result = await auth.connect();

    expect(result).toEqual({ ok: false, reason: "failed" });
    expect(await auth.status()).toBeNull();
  });
});

describe("createInMemoryGoogleAuth disconnect (Task 2)", () => {
  it("should clear status if disconnect is called while connected", async () => {
    const auth = createInMemoryGoogleAuth({ account: ACCOUNT });

    await auth.disconnect();

    expect(await auth.status()).toBeNull();
  });
});

describe("createGoogleAuth factory (Task 2)", () => {
  it("should return an in-memory fake when isTauri() is false", async () => {
    const auth = createGoogleAuth();

    expect(await auth.status()).toBeNull();
    const result = await auth.connect();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.account.email).toBe("string");
      expect(result.account.email.length).toBeGreaterThan(0);
    }
    expect(await auth.status()).toEqual(result.ok ? result.account : null);
  });
});

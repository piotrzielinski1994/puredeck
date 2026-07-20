# F8a - Plan: Connect a Google account (OAuth connection)

From approved [spec.md](spec.md). TDD, red-green-refactor per task. Covers **F8a
only** (OAuth connection; no deck storage - that is F8b).

## Approach

A new **`GoogleAuth` port** (`status` / `connect` / `disconnect`) sits at a seam
next to the existing per-port factories (`createCollectionStore`,
`createRevlogStore`): a Tauri adapter that `invoke`s Rust commands, and an
in-memory fake for tests/browser. This keeps the whole OAuth mechanism a **deep
module** behind three methods - the UI never sees PKCE, endpoints, or tokens.

The Rust side is an **anti-corruption layer** (`pz-ddd`): foreign shapes
(Google token response, userinfo) are module-private structs that never escape;
the commands return only our clean `{ email }` / access-token string. The
**refresh token lives in the OS keychain** (`keyring`); the access token stays
in Rust memory; `settings.json` holds only the non-secret `googleAccount.email`
as a display cache. Keychain is the source of truth for "connected"; the
settings cache lets the UI paint instantly and lets the browser/in-memory build
work with no keychain.

Transport is a seam with two adapters: desktop loopback (`tauri-plugin-oauth`)
and mobile custom-scheme (`tauri-plugin-deep-link`). Desktop is verified;
**mobile ships UNVERIFIED** (spec Risks).

Error handling is ADT, not try/catch across the UI: `connect` returns a tagged
`ConnectResult` (`{ ok: true; account }` | `{ ok: false; reason: "unconfigured"
| "failed" }`) so the section renders AC-011 vs AC-007 messages without
inspecting exceptions.

## File Structure

```
src/lib/settings/settings.ts                    MOD  + googleAccount?: {email}; merge it in mergeSettings
src/lib/settings/settings-context.tsx           MOD  + saveGoogleAccount(account?) mutator (set/clear)
src/lib/google/google-auth.ts                    NEW  GoogleAccount, ConnectResult, GoogleAuth port types
src/lib/google/in-memory-google-auth.ts          NEW  fake: in-memory account, scripted connect result
src/lib/google/tauri-google-auth.ts              NEW  adapter: invoke google_status/connect/disconnect, map to port
src/lib/google/google-auth-factory.ts            NEW  createGoogleAuth() -> isTauri() ? tauri : in-memory
src/components/settings/google-drive-section.tsx NEW  GoogleDriveSection: status reconcile, connect/disconnect, states
src/components/settings/storage-section.tsx      MOD  render <GoogleDriveSection/> below the folder controls
src-tauri/src/google_auth.rs                      NEW  OAuth ACL: PKCE, auth-url, token exchange, userinfo, keyring, 4 commands
src-tauri/src/lib.rs                              MOD  register oauth + deep-link plugins; add commands to invoke_handler; mod google_auth
src-tauri/Cargo.toml                              MOD  + tauri-plugin-oauth, tauri-plugin-deep-link, keyring, reqwest, sha2, base64, rand, url
src-tauri/capabilities/default.json               MOD  + oauth + deep-link permissions
src-tauri/tauri.conf.json                          MOD  + plugins.deep-link mobile scheme (com.pzielinski.puredeck)
package.json                                       MOD  + @fabianlars/tauri-plugin-oauth, @tauri-apps/plugin-deep-link
tests/settings-google-account.test.ts              NEW  saveGoogleAccount set/clear + merge (AC-003/005/006)
tests/google-auth-fake.test.ts                     NEW  in-memory fake + factory branch (Task 2)
tests/google-drive-section.test.tsx                NEW  UI states (AC-001/002/003/004/005/006/007/011/009)
tests/tauri-google-auth.test.ts                    NEW  adapter maps invoke result/rejection to ConnectResult
src-tauri/src/google_auth.rs (#[cfg(test)])        NEW  cargo tests: pkce_challenge vector, build_auth_url scopes (AC-008), parse_redirect state (E-2)
```

## Task breakdown

### Task 1: `googleAccount` settings field + `saveGoogleAccount` mutator

**Files:** Modify `settings.ts` (type + `mergeSettings`), `settings-context.tsx`
(mutator). Test: `tests/settings-google-account.test.ts` (new).

**Interfaces:**
- Produces: `Settings.googleAccount?: { email: string }`;
  `saveGoogleAccount(account: { email: string } | undefined): void` on the
  settings context value - a value sets it, `undefined` deletes it (mirrors
  `saveCollectionPath`). `mergeSettings` keeps a persisted `googleAccount` only
  when it is `{ email: string }`.
- Consumes: existing `update` reducer, `isRecord`, `Settings`.

- [ ] Write failing tests: setting an account persists `{email}`; clearing with
      `undefined` removes it (loads back absent); `mergeSettings` drops a
      malformed `googleAccount` (missing/empty email) and preserves a valid one.
- [ ] Run, confirm RED (field + mutator absent).
- [ ] Add field, merge branch, mutator + context type entry.
- [ ] Run, confirm GREEN.
- [ ] Commit `feat(F8a): AC-003 AC-006 googleAccount setting + saveGoogleAccount mutator`.

### Task 2: `GoogleAuth` port + in-memory fake + factory

**Files:** New `google-auth.ts`, `in-memory-google-auth.ts`,
`google-auth-factory.ts`. Test: `tests/google-auth-fake.test.ts` (new).

**Interfaces:**
- Produces:
  ```ts
  type GoogleAccount = { email: string };
  type ConnectResult =
    | { ok: true; account: GoogleAccount }
    | { ok: false; reason: "unconfigured" | "failed" };
  type GoogleAuth = {
    status: () => Promise<GoogleAccount | null>;
    connect: () => Promise<ConnectResult>;
    disconnect: () => Promise<void>;
  };
  createInMemoryGoogleAuth(opts?: {
    account?: GoogleAccount | null;                 // initial status
    onConnect?: () => ConnectResult;                // scripted connect (default ok with a demo email)
  }): GoogleAuth;                                    // connect(ok) sets status; disconnect clears
  createGoogleAuth(): GoogleAuth;                    // isTauri() ? tauri adapter : in-memory
  ```
- Consumes: `isTauri` from `@tauri-apps/api/core`.

- [ ] Write failing tests: fake starts at given status; `connect` returning ok
      flips `status` to the account and returns `{ok:true}`; a scripted
      `{ok:false, reason}` leaves status null; `disconnect` clears status;
      `createGoogleAuth()` returns the in-memory fake when `isTauri()` is false.
- [ ] Run, confirm RED (modules absent).
- [ ] Implement port types, fake, factory.
- [ ] Run, confirm GREEN.
- [ ] Commit `feat(F8a): GoogleAuth port + in-memory fake + factory`.

### Task 3: `GoogleDriveSection` UI + wire into Storage

**Files:** New `google-drive-section.tsx`; modify `storage-section.tsx` to
render it below the folder block. Test: `tests/google-drive-section.test.tsx`
(new).

**Interfaces:**
- Consumes: `useSettings().settings.googleAccount` + `saveGoogleAccount`
  (Task 1), a `GoogleAuth` (Task 2) - injectable `auth` prop defaulting to
  `createGoogleAuth()` for testability (accept-dependency, like
  `WorkspaceProvider`'s `store` prop).
- Behavior:
  - On mount, call `auth.status()`; reconcile the settings cache -
    if `status` is null but `settings.googleAccount` is set, clear it (E-4);
    if `status` has an account, ensure the cache matches.
  - Disconnected -> "Not connected." + **Connect Google Drive** button.
  - Connecting -> button "Connecting...", disabled.
  - `connect()` -> `{ok:true}` -> `saveGoogleAccount(account)`, show
    "Connected as `<email>`" + **Disconnect**; `{ok:false, reason:"unconfigured"}`
    -> "Google sign-in isn't configured."; `reason:"failed"` (or throw) ->
    "Couldn't connect to Google - try again."; stays disconnected either way.
  - Connected -> email + **Disconnect**; `disconnect()` ->
    `saveGoogleAccount(undefined)` -> disconnected.

- [ ] Write failing tests (inject a fake `auth`): subsection renders under
      Storage (AC-001); disconnected shows Connect, no email (AC-002); connect
      ok -> "Connected as ...", cache set, no Connect btn (AC-003/AC-004);
      disconnect -> cleared, "Not connected" (AC-005); mount with cached account
      + status ok -> shows connected without a click (AC-006); status null while
      cache set -> reconciles to disconnected (E-4); connect `reason:"failed"` ->
      error msg, cache unchanged (AC-007); connect `reason:"unconfigured"` ->
      "isn't configured" msg (AC-011); after ok-connect, saved account has only
      `email`, no token key (AC-009 frontend guard).
- [ ] Run, confirm RED.
- [ ] Build `GoogleDriveSection`, render it in `StorageSection`; guards over
      nesting, no `any`, ADT on `ConnectResult`.
- [ ] Run, confirm GREEN.
- [ ] Commit `feat(F8a): AC-001 AC-002 AC-004 AC-005 AC-007 AC-011 Google Drive connection UI`.

### Task 4: Rust deps + plugin/config plumbing (native, no unit test)

**Files:** Modify `Cargo.toml`, `lib.rs`, `capabilities/default.json`,
`tauri.conf.json`, `package.json`.

**Interfaces:**
- Produces: `tauri-plugin-oauth` + `tauri-plugin-deep-link` registered and
  callable; mobile scheme `com.pzielinski.puredeck` registered in config; the
  oauth/deep-link JS packages available. No commands yet (Task 5 adds them).
- Register `tauri_plugin_oauth::init()` and `tauri_plugin_deep_link::init()` in
  `lib.rs`; add plugin permissions to capabilities; add `plugins.deep-link`
  block to `tauri.conf.json`; `cargo add` the crates; `npm i` the JS packages.

- [ ] Add deps (`cargo add tauri-plugin-oauth tauri-plugin-deep-link keyring
      reqwest sha2 base64 rand url` in `src-tauri`; `npm i
      @fabianlars/tauri-plugin-oauth @tauri-apps/plugin-deep-link`).
- [ ] Register the two plugins + capabilities + config scheme.
- [ ] `cargo build` in `src-tauri` succeeds; `npm run build` + `npm test` green.
- [ ] Commit `feat(F8a): register oauth + deep-link plugins and deps`.

### Task 5: Rust OAuth ACL + commands + Tauri adapter

**Files:** New `src-tauri/src/google_auth.rs` (+ `#[cfg(test)]`); modify
`lib.rs` (`mod google_auth;`, add 4 commands to `invoke_handler`); new
`src/lib/google/tauri-google-auth.ts`. Test: `cargo test` in `src-tauri`
(pure helpers) + `tests/tauri-google-auth.test.ts` (adapter mapping).

**Interfaces:**
- Consumes: `GoogleAuth` port shape (Task 2), plugins + deps (Task 4),
  env vars `PUREDECK_GOOGLE_CLIENT_ID` / `PUREDECK_GOOGLE_CLIENT_SECRET`.
- Produces (Tauri commands):
  - `google_status() -> Option<GoogleAccountDto>` (`{email}` from keychain).
  - `google_connect() -> Result<GoogleAccountDto, String>` - Err code
    `"unconfigured"` when creds unset (AC-011), `"failed"` otherwise (AC-007);
    on Ok stores `{refresh_token,email}` in keychain (AC-009) and returns
    `{email}`. Scopes: `openid email
    https://www.googleapis.com/auth/drive.appdata` (AC-008).
  - `google_disconnect() -> Result<(), String>` - delete keychain entry,
    best-effort revoke (E-6).
  - `google_access_token() -> Result<String, String>` - refresh via keychain
    token; on `invalid_grant` delete entry + Err (E-4). Consumed by F8b.
  - Module-private pure helpers (cargo-tested): `pkce_challenge(verifier)`,
    `build_auth_url(...)`, `parse_redirect(url, expected_state)`.
  - `createTauriGoogleAuth(): GoogleAuth` - `invoke` the commands; map a
    `google_connect` resolve -> `{ok:true,account}` and a reject carrying
    `"unconfigured"`/other -> `{ok:false, reason}`.
- Foreign Google DTOs (`TokenResponse`, `UserInfo`) are module-private, never
  returned to JS (ACL wall).

- [ ] Write failing cargo tests: `pkce_challenge` matches the RFC 7636 known
      vector; `build_auth_url` contains `code_challenge_method=S256`,
      `access_type=offline`, `prompt=consent`, and all three scopes incl.
      `drive.appdata` (AC-008); `parse_redirect` rejects a `state` mismatch
      (E-2). Write failing `tauri-google-auth.test.ts` (mock
      `@tauri-apps/api/core` `invoke`): connect resolve -> `{ok:true}`; reject
      `"unconfigured"` -> `{ok:false, reason:"unconfigured"}`; other reject ->
      `reason:"failed"`; status/disconnect delegate.
- [ ] Run, confirm RED (`cargo test`, `npm test`).
- [ ] Implement the ACL module + commands + adapter; register in `lib.rs`.
- [ ] Run, confirm GREEN (`cargo test`, `npm test`, `cargo build`, `npm run build`).
- [ ] Live smoke (deferred until real creds): `npm start`, Connect -> consent ->
      "Connected as ...", quit + relaunch still connected, `google_access_token`
      returns a token (AC-010/TC-007). Mark UNVERIFIED for mobile.
- [ ] Commit `feat(F8a): AC-008 AC-009 AC-010 Google OAuth ACL + commands + adapter`.

## Edge cases (from spec)

- E-1 cancel/deny -> `connect` `{ok:false, reason:"failed"}` -> error, no token
  (Task 3 + Task 5).
- E-2 `state` mismatch -> `parse_redirect` rejects (Task 5, cargo test).
- E-3 creds unset -> `reason:"unconfigured"`, distinct message (Task 3 + 5).
- E-4 refresh `invalid_grant` -> clear entry; `status()` null -> UI reconciles
  to disconnected (Task 3 + 5).
- E-5 no refresh token returned -> `prompt=consent` forces one; if still absent,
  `connect` fails rather than storing a useless connection (Task 5).
- E-6 disconnect offline -> revoke best-effort, local delete always (Task 5).
- E-7 double connect -> replaces stored token/email (single connection)
  (Task 5).
- E-8 keychain unavailable -> `connect` fails, no partial state (Task 5).

## Tests to write (>= one per AC)

| AC | Test |
| -- | ---- |
| AC-001 | google-drive-section: subsection renders under Storage |
| AC-002 | google-drive-section: disconnected shows Connect, no email |
| AC-003 | google-drive-section: connect ok -> connected + cache set |
| AC-004 | google-drive-section: connected shows email + Disconnect, no Connect |
| AC-005 | google-drive-section: disconnect clears cache -> disconnected |
| AC-006 | google-drive-section: cached account + status ok -> connected on mount |
| AC-007 | google-drive-section: connect `reason:"failed"` -> error, cache unchanged |
| AC-008 | cargo: `build_auth_url` includes openid/email/drive.appdata scopes |
| AC-009 | google-drive-section: saved account has only `email` (no token); native keychain (live) |
| AC-010 | live smoke (native; restart + refresh) - manual, Task 5 |
| AC-011 | google-drive-section: connect `reason:"unconfigured"` -> not-configured msg |

## Verification (Phase 4)

Fresh verifier subagent: `npm run lint`, `npm run typecheck`, full `npm test`,
`cargo test` + `cargo build` in `src-tauri`; adversarial edge probe (E-2..E-8);
AC->test table. UI change is a small text/button block - verifier drives the
running app for the connected/disconnected render at desktop + mobile widths
(no live OAuth without creds; assert on rendered state via the injected fake).
Coverage threshold: none. Live OAuth (AC-010/TC-007) + all mobile: deferred /
UNVERIFIED per spec Risks.
```

## Risks

Carried from spec: mobile UNVERIFIED (no toolchain + Android scheme
restrictions); placeholder creds block live connect (AC-011 covers the clean
degrade); `keyring` v4 mobile backend unverified. No new plan-level risks.

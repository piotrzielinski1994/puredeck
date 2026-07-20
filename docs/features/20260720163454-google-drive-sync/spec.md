# F8a - Connect a Google account (OAuth connection)

Feature folder: `docs/features/20260720163454-google-drive-sync/`
Branch: `20260720163454-google-drive-sync`

> **F8 is split into three sequential cycles** (each spec -> plan -> implement -> verify -> merge before the next):
>
> - **F8a (this spec)** - Google account OAuth **connection** only: connect / disconnect, token storage + refresh, "Connected as X" status in Settings. No deck storage yet.
> - **F8b** - `GoogleDriveCollectionStore` behind the existing `CollectionStore` seam + `DriveClient` anti-corruption layer; a mutually-exclusive **data source** picker (Local folder vs Google Drive); decks load/save to the Drive hidden app folder.
> - **F8c** - Offline read-through cache + write queue that flushes on reconnect.
>
> This spec covers **F8a only**. F8b/F8c get their own specs in this same folder when their cycle starts.

## Overview

Let the user link one Google account to puredeck via OAuth 2.0 with PKCE, so a
later feature (F8b) can store decks in that account's hidden Drive app folder.
A new **Google Drive** area in `Settings > Storage` shows the connection state:
a **Connect** action when disconnected, and **Connected as `<email>`** with a
**Disconnect** action when connected. The refresh token is kept in the OS
keychain; the access token lives only in memory and is refreshed on demand.

Connecting here does **not** change where decks load from - the data source is
still the local folder. Wiring the connection into deck load/save is F8b.

### Why

- F8 (store decks in Google Drive) needs an authenticated link before anything
  can read or write Drive. OAuth + secure token lifecycle is the hardest,
  riskiest slice; isolating it as F8a lets it be built and verified on its own.
- The `Settings > Storage` section (added by F7) is the natural home for the
  connection status, next to the local-folder controls it will later sit beside
  in a source picker (F8b).

### Canonical terms

See [docs/glossary.md](../../glossary.md): **Drive connection** (the
authenticated link, connected/disconnected), **Data source** (which backend
decks load through - Local folder or Google Drive; selection is F8b, not F8a).

## Scope

**In scope (F8a)**

1. `Settings > Storage` gains a **Google Drive** subsection showing connection
   state and a Connect / Disconnect control.
2. OAuth 2.0 **authorization-code + PKCE** flow for an installed app:
   - **Desktop**: loopback redirect (`http://127.0.0.1:<port>`) via
     `tauri-plugin-oauth`.
   - **Mobile (Android/iOS)**: custom-scheme redirect via
     `tauri-plugin-deep-link`. **Ships UNVERIFIED** (see Risks).
3. Scopes requested **up front** (installed apps cannot do incremental auth):
   `openid email` (to show "Connected as `<email>`") **and**
   `https://www.googleapis.com/auth/drive.appdata` (so F8b needs no re-consent).
4. Token lifecycle: exchange code -> tokens; persist the **refresh token** in
   the OS keychain (`keyring`); refresh the access token on demand; a
   `google_access_token` command returns a fresh access token (consumed by F8b).
5. Connection status derived from keychain presence; account email persisted
   locally (non-secret) so the status shows without a network call.
6. Disconnect: delete the stored refresh token, best-effort revoke at Google,
   clear the persisted email.
7. A `GoogleAuth` frontend port (`status` / `connect` / `disconnect`) with a
   Tauri adapter (invoke) and an in-memory fake for tests, mirroring the
   existing store-factory seams.

**Out of scope (YAGNI / later cycles)**

- Any deck read/write to Drive, the `GoogleDriveCollectionStore`, the
  `DriveClient` ACL, the Local-vs-Drive source picker -> **F8b**.
- Offline cache / write queue -> **F8c**.
- Multiple Google accounts at once (exactly one connection).
- Working end-to-end without real OAuth credentials (placeholder creds; see
  Infrastructure Prerequisites).
- Google Sign-In SDK / AppAuth. We use the raw OAuth endpoints + Tauri plugins.

## Data model

No deck-model change. Two new pieces of state, split by sensitivity:

```ts
// Non-secret, persisted locally (settings.json) so status shows offline.
type Settings = {
  // ...existing fields...
  googleAccount?: { email: string }; // present iff a Drive connection exists
};

// Frontend port (new seam), mirrors createCollectionStore / createReviewStore.
type GoogleAccount = { email: string };

// Tagged result so the UI renders AC-011 (unconfigured) vs AC-007 (failed)
// without inspecting exceptions (ADT over try/catch).
type ConnectResult =
  | { ok: true; account: GoogleAccount }
  | { ok: false; reason: "unconfigured" | "failed" };

type GoogleAuth = {
  status: () => Promise<GoogleAccount | null>; // null = disconnected
  connect: () => Promise<ConnectResult>;        // runs the OAuth flow
  disconnect: () => Promise<void>;
};
```

**Secret (never in settings.json, never logged):** the OAuth **refresh token**
lives only in the OS keychain via `keyring`
(service `com.pzielinski.puredeck`, account `google-refresh-token`). The
**access token** + its expiry live only in Rust process memory and are
refreshed on demand; they are never persisted.

Source of truth for "connected": a refresh token exists in the keychain. The
persisted `googleAccount.email` is a display cache kept in step with it
(written on connect, cleared on disconnect).

## OAuth flow (grounded API facts)

- Authorization endpoint: `https://accounts.google.com/o/oauth2/v2/auth`
  (params: `client_id`, `redirect_uri`, `response_type=code`, `scope`,
  `code_challenge`, `code_challenge_method=S256`, `state`, `access_type=offline`,
  `prompt=consent` - the last two force a refresh token).
- Token endpoint: `https://oauth2.googleapis.com/token` (exchange:
  `grant_type=authorization_code` + `code` + `code_verifier` + `client_id`
  [+ `client_secret` for the Desktop client type] + `redirect_uri`; refresh:
  `grant_type=refresh_token` + `refresh_token` + `client_id` [+ secret]).
- PKCE: `code_verifier` 43-128 unreserved chars;
  `code_challenge = base64url(sha256(verifier))`, method `S256`.
- Userinfo (for the email): OpenID `email` claim via the userinfo endpoint
  `https://openidconnect.googleapis.com/v1/userinfo` with the access token.
- Desktop redirect: `tauri-plugin-oauth` `start()` opens a localhost listener on
  an OS-assigned port and hands back the full redirect URL; we validate `state`.
- Mobile redirect: `tauri-plugin-deep-link`, scheme registered in
  `tauri.conf.json` (must be re-DNS with a period, path is single-slash:
  `com.pzielinski.puredeck:/oauth2redirect`). Google requires **separate OAuth
  client IDs per platform** (Desktop / Android / iOS).

## Acceptance criteria

- AC-001: A **Google Drive** subsection appears in `Settings > Storage`,
  below the existing local-folder controls.
- AC-002: When disconnected, the subsection shows a **Connect Google Drive**
  action and a "Not connected" state; no email is shown.
- AC-003: Activating **Connect** runs the OAuth flow via the `GoogleAuth` port;
  on success the subsection switches to **Connected as `<email>`** and persists
  `settings.googleAccount = { email }`.
- AC-004: When connected, the subsection shows the account email and a
  **Disconnect** action; the **Connect** action is not shown.
- AC-005: Activating **Disconnect** clears the connection: the refresh token is
  removed from the keychain, `settings.googleAccount` is cleared, and the
  subsection returns to the disconnected state.
- AC-006: On app launch the subsection reflects persisted state - **Connected as
  `<email>`** if a connection exists, disconnected otherwise - with no user
  action required.
- AC-007: If the OAuth flow fails or is cancelled, the subsection shows an
  inline error and stays **disconnected**; `settings.googleAccount` is unchanged
  and no partial token is stored.
- AC-008: The OAuth authorization request includes **all three** scopes
  (`openid`, `email`, `drive.appdata`) so F8b needs no second consent.
- AC-009: The refresh token is stored in the OS keychain, **never** in
  `settings.json` / `tauri-plugin-store` and never written to a log.
- AC-010 (desktop): A stored connection survives an app restart - relaunching
  shows **Connected as `<email>`** and `google_access_token` returns a fresh
  token by refreshing (no re-consent).
- AC-011: With OAuth credentials **unset** (placeholder state), **Connect**
  fails cleanly with a "Google sign-in isn't configured" message and leaves the
  state disconnected - the app does not crash.

## User test cases

- TC-001 (happy, AC-001/AC-002): Open `Settings > Storage` while disconnected ->
  a "Google Drive" subsection shows "Not connected" + a **Connect Google Drive**
  button. Maps to AC-001, AC-002.
- TC-002 (happy, AC-003/AC-004/AC-008): Click **Connect**; the `GoogleAuth` port
  resolves with `{ email: "a@b.com" }` -> subsection shows "Connected as
  a@b.com" + **Disconnect**, `settings.googleAccount` is set, and the auth
  request carried the `drive.appdata` scope. Maps to AC-003, AC-004, AC-008.
- TC-003 (disconnect, AC-005): While connected, click **Disconnect** -> port
  `disconnect` called, `settings.googleAccount` cleared, subsection returns to
  "Not connected". Maps to AC-005.
- TC-004 (restore, AC-006): Mount with `settings.googleAccount = {email}` and a
  port `status` that resolves connected -> subsection shows "Connected as
  `<email>`" with no click. Maps to AC-006.
- TC-005 (error, AC-007): Click **Connect**; port `connect` rejects -> inline
  error shown, state stays "Not connected", `settings.googleAccount` unchanged.
  Maps to AC-007.
- TC-006 (unconfigured, AC-011): With creds unset, `connect` rejects with a
  config error -> "Google sign-in isn't configured" message, no crash, stays
  disconnected. Maps to AC-011.
- TC-007 (native restart, AC-010): Desktop - connect, quit, relaunch ->
  "Connected as `<email>`" without re-consent; `google_access_token` returns a
  non-empty token. **Manual/live** (native keychain + refresh). Maps to AC-010.
- TC-008 (secret hygiene, AC-009): After connect, assert no refresh token
  appears in `settings.json` / the persisted store and none is logged.
  Maps to AC-009.

## UI states

| State        | Behavior                                                             |
| ------------ | -------------------------------------------------------------------- |
| Disconnected | "Not connected" + **Connect Google Drive** button.                   |
| Connecting   | Button shows "Connecting..." and is disabled (browser/consent open). |
| Connected    | "Connected as `<email>`" + **Disconnect** button.                    |
| Error        | Inline "Couldn't connect to Google - try again." + Connect button.   |
| Unconfigured | Inline "Google sign-in isn't configured." + Connect button.          |

### Wireframes (desktop)

Disconnected:

```
[ Theme ] [ Shortcuts ] [ Storage ]
+--------------------------------------------------------------+
| Storage                                                      |
| Where your decks are stored.                                 |
|                                                              |
|  Folder                                                      |
|  +--------------------------------------------------+        |
|  | Default app data folder                          |        |
|  +--------------------------------------------------+        |
|  [ Choose folder ]                                           |
|                                                              |
|  Google Drive                                                |
|  Not connected.                                              |
|  [ Connect Google Drive ]                                    |
+--------------------------------------------------------------+
```

Connected:

```
+--------------------------------------------------------------+
| Storage                                                      |
| Where your decks are stored.                                 |
|                                                              |
|  Folder                                                      |
|  +--------------------------------------------------+        |
|  | Default app data folder                          |        |
|  +--------------------------------------------------+        |
|  [ Choose folder ]                                           |
|                                                              |
|  Google Drive                                                |
|  Connected as jane@example.com                               |
|  [ Disconnect ]                                              |
+--------------------------------------------------------------+
```

Error / Unconfigured (Connect still available):

```
+--------------------------------------------------------------+
|  Google Drive                                                |
|  Couldn't connect to Google - try again.                     |
|  [ Connect Google Drive ]                                    |
+--------------------------------------------------------------+
```

Mobile (< 768px) - same actions, stacked full-width (OAuth is a mobile target,
so unlike the folder picker there is no "desktop-only" note):

```
+----------------------------------+
| Storage                          |
|  ...folder (read-only)...        |
|                                  |
|  Google Drive                    |
|  Not connected.                  |
|  [ Connect Google Drive ]        |
+----------------------------------+
```

## Edge cases

- E-1 (cancel/deny consent): user closes the browser or denies -> `connect`
  rejects -> error state, no token stored (AC-007).
- E-2 (state mismatch): redirect `state` != the one we sent -> reject the flow
  as a CSRF failure, no token exchange.
- E-3 (creds unset): placeholder credentials -> `connect` returns a distinct
  config error, distinct message from a network failure (AC-011).
- E-4 (refresh fails / revoked): `google_access_token` refresh returns
  `invalid_grant` -> treat as disconnected (clear stored token + email), so the
  UI shows "Not connected" rather than a stuck "Connected" (feeds AC-006/AC-010;
  full offline handling is F8c).
- E-5 (no refresh token returned): Google omits a refresh token (already granted
  earlier) -> we send `prompt=consent` to force one; if still absent, fail the
  connect with an actionable error rather than storing a useless connection.
- E-6 (disconnect while offline): revoke call fails -> still delete the local
  token + email so the app shows disconnected (revoke is best-effort).
- E-7 (double connect): connecting while already connected replaces the stored
  token/email for the newly chosen account (single connection invariant).
- E-8 (keychain unavailable): OS keychain access throws -> connect fails with a
  clear error, no partial state.

## Dependencies

- **New Rust crates** (`src-tauri/Cargo.toml`): `tauri-plugin-oauth` 2.1.0
  (desktop loopback), `tauri-plugin-deep-link` 2.4.9 (mobile scheme), `keyring`
  4.1.5 (OS keychain), plus an HTTP client for the token/userinfo calls
  (`reqwest`) and PKCE/random/sha helpers.
- **New npm deps**: `@fabianlars/tauri-plugin-oauth`,
  `@tauri-apps/plugin-deep-link`.
- **Capabilities** (`src-tauri/capabilities/default.json`): permissions for the
  oauth + deep-link plugins.
- **Config** (`tauri.conf.json`): `plugins.deep-link` scheme registration
  (`com.pzielinski.puredeck`) for mobile; a CSP that permits the Google OAuth
  hosts is not needed because the redirect is handled natively, but the
  userinfo/token fetch runs in Rust (no webview CSP impact).
- Existing seams reused: `SettingsStore` (for `googleAccount`), the
  factory-per-port pattern (`GoogleAuth` factory like `createCollectionStore`),
  `useIsMobile`, the `Settings > Storage` section.

## Infrastructure Prerequisites

| Category              | Requirement                                                        |
| --------------------- | ------------------------------------------------------------------ |
| Environment variables | `PUREDECK_GOOGLE_CLIENT_ID` (+ `PUREDECK_GOOGLE_CLIENT_SECRET` for the Desktop client). Unset -> Connect returns the config error (AC-011). Read in Rust at runtime; never hardcoded. |
| Registry images       | N/A                                                                |
| Cloud quotas          | N/A (personal Google account; Drive API default quota)             |
| Network reachability  | `accounts.google.com`, `oauth2.googleapis.com`, `openidconnect.googleapis.com` reachable from the machine running the app (live/manual TCs only). |
| CI status             | N/A                                                                |
| External secrets      | A Google Cloud OAuth **Desktop** client (and, for mobile e2e, an Android client [package + SHA-1] and an iOS client [bundle id]). **Not provisioned** - placeholder per user decision; e2e connect deferred until supplied. |
| Database migrations   | N/A                                                                |

Verification before implementation: unit/integration tests run against the
in-memory `GoogleAuth` fake and mocked Tauri `invoke`, so they need no real
credentials. Live connect (TC-007) is deferred until real creds exist - tracked
as a known gap, not a blocker for the coded ACs.

## Risks

- **Mobile ships UNVERIFIED**: mobile targets are not bootstrapped (no
  `src-tauri/gen/android` / `gen/apple`, no toolchain/emulator here) and Google
  has **restricted custom-URI-scheme redirects on Android** (recommends GIS /
  AppAuth). Mitigation: build the desktop path fully verified; wire the mobile
  deep-link path and document it, but mark it UNVERIFIED and defer live mobile
  proof to a dedicated cycle once `tauri android/ios init` + a device/emulator
  exist. The `GoogleAuth` seam is transport-agnostic, so the desktop work is not
  throwaway.
- **Placeholder credentials**: no live OAuth without real client IDs; AC-011
  covers the unconfigured path so the app degrades cleanly. Live connect is a
  deferred manual check.
- **keyring v4 mobile coverage**: `keyring` 4.x restructured into pluggable
  store crates; Android Keystore / iOS Keychain backends must be verified per
  target before relying on them. Mitigation: desktop keychain is the verified
  path; mobile token storage is part of the UNVERIFIED mobile risk above.
- **Refresh-token scarcity**: Google limits refresh tokens per client/user;
  `prompt=consent` forces issuance (E-5). Mitigation: reuse the stored token,
  only re-consent on explicit reconnect.

## Decision Log

Append-only. One row per architectural/design decision made while working F8a.

| Date       | Decision | Rationale |
| ---------- | -------- | --------- |
| 2026-07-20 | Design gate: evaluated `pz-ddd`, `pz-archetypes`, `pz-codebase-design`. **Invoked** `pz-codebase-design` (new `GoogleAuth` port + adapters at a seam) and `pz-ddd` (Google API is external -> anti-corruption layer around it, foreign DTOs stay package-private). `pz-archetypes` **not** invoked - OAuth/connection is not an accounting/inventory/pricing/etc. domain shape. | Mandatory gate. F8a introduces a new module interface (structural) and integrates an external system (ACL); no recurring domain archetype fits. |
| 2026-07-20 | F8 decomposed into 3 sequential cycles (F8a OAuth / F8b Drive store / F8c offline cache), each merged before the next. | Single ticket spans multiple subsystems; per-cycle verified checkpoints beat one huge diff. |
| 2026-07-20 | Drive = a **data source** behind the existing `CollectionStore` seam (F8b adds a 3rd adapter), Local vs Drive **mutually exclusive**. | F7 spec explicitly reserved this seam for F8; two adapters already exist so a third is a real seam, not speculative. |
| 2026-07-20 | Scope `drive.appdata` requested at **F8a connect** (up front with `openid email`), not at F8b. | Installed apps cannot do incremental authorization (Google docs) - a second scope request would force re-consent. |
| 2026-07-20 | Refresh token in **OS keychain** (`keyring`), access token in-memory only; `tauri-plugin-store`/`settings.json` hold only the non-secret email. | `tauri-plugin-store` is plaintext; secrets hygiene requires the keychain. Stronghold rejected (needs a user passphrase or re-introduces the key-storage problem) for a background-refresh token. |
| 2026-07-20 | Hidden **appDataFolder** (`drive.appdata`), not a visible My Drive folder. | Least privilege, non-sensitive scope, app-private JSON; user-visible/shareable decks were not required. |
| 2026-07-20 | `keyring` crate pinned to **v3** (`apple-native`/`windows-native`/`sync-secret-service`/`crypto-rust` features), not the v4 the research noted. | v4's split into `keyring-core` + pluggable store crates churned the API; v3.6 has a stable `Entry`/`set_password`/`get_password`/`delete_credential` surface and the OS backends we need. Mobile keyring backend stays part of the UNVERIFIED mobile risk. |
| 2026-07-20 | Mount status-reconcile effect keyed on the stable `client` only; cache + mutator read via a ref, writes guarded by email difference. | Verifier BUG-1: the real Tauri `status()` returns a fresh `{email}` object per call, so keying the effect on `settings.googleAccount` looped forever (continuous network refresh). Ref + difference-guard makes reconcile fire once. Regression test injects a fresh-object `status()` and asserts exactly one call. |

## Status

**F8a implemented + verified (2026-07-20).** All coded ACs pass; gates green
(`npm run lint` 0 errors, `npm run typecheck` clean, `npm test` 286 passing,
`cargo test` 5 passing, `cargo build` clean). Two fresh-context verifier passes:
the first found BUG-1 (infinite status loop), the second confirmed the fix.

**Deferred / UNVERIFIED (per Risks, not failures):**
- AC-010 / TC-007 live OAuth connect + token refresh across restart - needs real
  Google OAuth credentials (placeholder per decision); code path exists.
- All mobile (Android/iOS) - targets not bootstrapped, no toolchain/emulator,
  Google restricts custom-URI-scheme redirects on Android. Desktop path is the
  verified one; the `GoogleAuth` seam is transport-agnostic.

## AC -> test traceability

| AC | Test(s) |
| -- | ------- |
| AC-001 | `google-drive-section.test.tsx` "render a Google Drive subsection inside the Storage section" |
| AC-002 | `google-drive-section.test.tsx` "show Not connected and a Connect button with no email if disconnected" |
| AC-003 | `google-drive-section.test.tsx` "show Connected as <email>... persist googleAccount if connect resolves ok"; `settings-google-account.test.ts` "persist googleAccount"; `tauri-google-auth.test.ts` "return ok with the account" |
| AC-004 | `google-drive-section.test.tsx` "show Connected as <email>..." (asserts Disconnect present, Connect absent) |
| AC-005 | `google-drive-section.test.tsx` "return to Not connected and clear the cache if Disconnect is clicked"; `settings-google-account.test.ts` "clear googleAccount"; `tauri-google-auth.test.ts` "invoke google_disconnect" |
| AC-006 | `google-drive-section.test.tsx` "show Connected as <email> with no click...", "cache the account once if status finds a connection while the cache is empty", "not re-query status in a loop..." (regression); `settings-google-account.test.ts` mergeSettings |
| AC-007 | `google-drive-section.test.tsx` "inline error and stay disconnected..."; `tauri-google-auth.test.ts` "return reason failed if google_connect rejects with any other error" |
| AC-008 | cargo `google_auth::tests::build_auth_url_requests_all_scopes_and_pkce` (openid/email/drive.appdata + S256 + offline + consent) |
| AC-009 | `google-drive-section.test.tsx` "persist a googleAccount holding only an email key"; refresh token stored only via `keyring` in `google_auth.rs`, never logged/persisted to settings |
| AC-010 | Deferred (live native restart + refresh) - code path present, needs creds |
| AC-011 | `google-drive-section.test.tsx` "isn't-configured message..."; `tauri-google-auth.test.ts` "return reason unconfigured..."; cargo `read_config` -> `ERR_UNCONFIGURED` |
| E-2 | cargo `parse_redirect_rejects_state_mismatch`, `parse_redirect_rejects_missing_code` |
| E-4 | `google-drive-section.test.tsx` "reconcile to disconnected and clear the cache if status is null while a cache is set" |

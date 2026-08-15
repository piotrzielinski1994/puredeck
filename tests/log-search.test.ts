import { describe, expect, it } from "vitest";
import { parseLogLine } from "@/lib/workspace/log-line";
// F1 - RED: structured `field:value` search over parsed LogLines. `filterLogLines`
// does not exist yet - the import fails until `@/lib/workspace/log-search` ships.
import { filterLogLines } from "@/lib/workspace/log-search";

// A fixture spanning the puredeck formatter shapes and levels the filter must
// discriminate. kv is `email` only; `level`/`message` are always-supported.
const connectOk = parseLogLine(
  "[2026-07-10T12:34:56Z][INFO] google_connect ok email=jane@example.com (34ms)",
  3,
);
const connectErr = parseLogLine(
  "[2026-07-10T12:34:56Z][ERROR] google_connect failed (40ms): connection refused",
  5,
);
const disconnect = parseLogLine(
  "[2026-07-10T12:34:56Z][INFO] google_disconnect ok (7ms)",
  3,
);
const tokenErr = parseLogLine(
  "[2026-07-10T12:34:56Z][ERROR] google_access_token failed (5ms): no refresh token",
  5,
);
const bridge = parseLogLine(
  "[2026-07-10T12:34:56Z][WARN] deck failed to save: disk full",
  4,
);

const lines = [connectOk, connectErr, disconnect, tokenErr, bridge];

describe("filterLogLines - field tokens (AC-014 / TC-008)", () => {
  it("should return only error lines for level:error", () => {
    expect(filterLogLines(lines, "level:error")).toEqual([
      connectErr,
      tokenErr,
    ]);
  });

  it("should return only warn lines for level:warn", () => {
    expect(filterLogLines(lines, "level:warn")).toEqual([bridge]);
  });

  it("should match the message field by case-insensitive substring", () => {
    expect(filterLogLines(lines, "message:failed")).toEqual([
      connectErr,
      tokenErr,
      bridge,
    ]);
  });

  it("should match a kv field by case-insensitive substring", () => {
    expect(filterLogLines(lines, "email:jane")).toEqual([connectOk]);
    expect(filterLogLines(lines, "email:JANE")).toEqual([connectOk]);
    expect(filterLogLines(lines, "email:example")).toEqual([connectOk]);
  });
});

describe("filterLogLines - quoted message term (AC-014 / TC-008)", () => {
  it("should match a quoted message term with a space against the error tail", () => {
    expect(filterLogLines(lines, 'message:"connection refused"')).toEqual([
      connectErr,
    ]);
    expect(filterLogLines(lines, 'message:"no refresh token"')).toEqual([
      tokenErr,
    ]);
  });

  it("should not match a quoted message term that appears nowhere", () => {
    expect(filterLogLines(lines, 'message:"totally absent phrase"')).toEqual(
      [],
    );
  });
});

describe("filterLogLines - combining and empties (AC-014 / TC-008)", () => {
  it("should AND-combine a field token with a bare term", () => {
    expect(filterLogLines(lines, "level:info email:jane")).toEqual([connectOk]);
    expect(filterLogLines(lines, "level:error failed")).toEqual([
      connectErr,
      tokenErr,
    ]);
  });

  it("should return all lines for an empty query", () => {
    expect(filterLogLines(lines, "")).toEqual(lines);
  });

  it("should return all lines for a whitespace-only query", () => {
    expect(filterLogLines(lines, "   ")).toEqual(lines);
  });
});

describe("filterLogLines - bare terms and unknown fields (AC-014 / TC-008)", () => {
  it("should match a bare term as a case-insensitive substring of raw", () => {
    expect(filterLogLines(lines, "refused")).toEqual([connectErr]);
    expect(filterLogLines(lines, "GOOGLE")).toEqual([
      connectOk,
      connectErr,
      disconnect,
      tokenErr,
    ]);
  });

  it("should treat an unknown field prefix as a bare term on raw", () => {
    expect(filterLogLines(lines, "account:foo")).toEqual([]);
    expect(filterLogLines(lines, "nope:whatever")).toEqual([]);
  });
});

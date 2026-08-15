import { describe, expect, it } from "vitest";

// F1 - RED: pure parser for the Logs panel. `parseLogLine` does not exist yet,
// so this file fails on the missing `@/lib/workspace/log-line` module import -
// the feature-shaped failure, not a typo.
import { parseLogLine } from "@/lib/workspace/log-line";

// The five puredeck formatter shapes the backend emits (google connect ok/err,
// disconnect, token err) plus a `log_message` bridge line and a generic info
// line, exactly as tauri-plugin-log delivers them in the `message` field.
const CONNECT_OK =
  "[2026-07-10T12:34:56Z][INFO] google_connect ok email=jane@example.com (34ms)";
const CONNECT_ERR =
  "[2026-07-10T12:34:56Z][ERROR] google_connect failed (40ms): connection refused";
const DISCONNECT = "[2026-07-10T12:34:56Z][INFO] google_disconnect ok (7ms)";
const TOKEN_ERR =
  "[2026-07-10T12:34:56Z][ERROR] google_access_token failed (5ms): no refresh token";
const BRIDGE = "[2026-07-10T12:34:56Z][WARN] deck failed to save: disk full";
const GENERIC =
  "[2026-07-10T12:34:56Z][INFO] puredeck starting (log file puredeck-20260815123045.log)";

const TS = "2026-07-10T12:34:56Z";

describe("parseLogLine - puredeck formatter shapes (AC-011 / TC-006)", () => {
  it("should parse a google connect-ok line into timestamp, info level, message and the email kv", () => {
    const line = parseLogLine(CONNECT_OK, 3);

    expect(line.raw).toBe(CONNECT_OK);
    expect(line.timestamp).toBe(TS);
    expect(line.level).toBe("info");
    expect(line.message).toBe(
      "google_connect ok email=jane@example.com (34ms)",
    );
    expect(line.kv).toEqual({ email: "jane@example.com" });
  });

  it("should parse a google connect-error line as error and keep the space-bearing tail in message, not kv", () => {
    const line = parseLogLine(CONNECT_ERR, 5);

    expect(line.timestamp).toBe(TS);
    expect(line.level).toBe("error");
    expect(line.message).toBe(
      "google_connect failed (40ms): connection refused",
    );
    expect(line.message).toContain("connection refused");
    expect(line.kv).toEqual({});
    expect(line.kv).not.toHaveProperty("connection");
    expect(line.kv).not.toHaveProperty("refused");
  });

  it("should parse a google disconnect line as an info line with no kv", () => {
    const line = parseLogLine(DISCONNECT, 3);

    expect(line.level).toBe("info");
    expect(line.message).toBe("google_disconnect ok (7ms)");
    expect(line.kv).toEqual({});
  });

  it("should parse a google access-token error line and keep the failure tail in message, not kv", () => {
    const line = parseLogLine(TOKEN_ERR, 5);

    expect(line.level).toBe("error");
    expect(line.message).toBe(
      "google_access_token failed (5ms): no refresh token",
    );
    expect(line.message).toContain("no refresh token");
    expect(line.kv).toEqual({});
  });

  it("should parse a log_message bridge line with its level and message", () => {
    const line = parseLogLine(BRIDGE, 4);

    expect(line.level).toBe("warn");
    expect(line.message).toBe("deck failed to save: disk full");
    expect(line.kv).toEqual({});
  });

  it("should parse a generic info line without kv", () => {
    const line = parseLogLine(GENERIC, 3);

    expect(line.level).toBe("info");
    expect(line.message).toBe(
      "puredeck starting (log file puredeck-20260815123045.log)",
    );
    expect(line.kv).toEqual({});
  });
});

describe("parseLogLine - level source precedence (AC-011 / TC-007a)", () => {
  it("should take the level from the numeric plugin level over the token", () => {
    expect(parseLogLine(CONNECT_OK, 5).level).toBe("error");
    expect(parseLogLine(CONNECT_ERR, 3).level).toBe("info");
  });

  it("should take the level from the token when no numeric level is given", () => {
    expect(parseLogLine(CONNECT_ERR).level).toBe("error");
    expect(parseLogLine(BRIDGE).level).toBe("warn");
  });

  it("should map each numeric plugin level 1..5 to its LogLevel", () => {
    const base = "[2026-07-10T12:34:56Z][INFO] google_disconnect ok (7ms)";
    expect(parseLogLine(base, 1).level).toBe("trace");
    expect(parseLogLine(base, 2).level).toBe("debug");
    expect(parseLogLine(base, 3).level).toBe("info");
    expect(parseLogLine(base, 4).level).toBe("warn");
    expect(parseLogLine(base, 5).level).toBe("error");
  });
});

describe("parseLogLine - unparseable fallback (AC-011 / TC-007b / TC-007c)", () => {
  it("should default to info when neither a numeric level nor a level token is present", () => {
    expect(parseLogLine("[2026-07-10T12:34:56Z][NOPE] hello").level).toBe(
      "info",
    );
  });

  it("should fall back to an info line with the raw message and empty kv when the shape does not match", () => {
    const raw = "some line that does not match the shape at all";
    const line = parseLogLine(raw);

    expect(line).toEqual({
      raw,
      timestamp: "",
      level: "info",
      message: raw,
      kv: {},
    });
  });

  it("should never throw on empty or malformed input", () => {
    expect(() => parseLogLine("")).not.toThrow();
    expect(() => parseLogLine("[unterminated bracket")).not.toThrow();
    expect(() => parseLogLine("][")).not.toThrow();

    const empty = parseLogLine("");
    expect(empty.level).toBe("info");
    expect(empty.timestamp).toBe("");
    expect(empty.kv).toEqual({});
  });
});

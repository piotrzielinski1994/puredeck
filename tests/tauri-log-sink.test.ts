import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
// F1 - RED: the FE -> file-log bridge. `createTauriLogSink`/`logMessage` do not
// exist yet - the import fails until `@/lib/logging/tauri-log-sink` ships.
import { createTauriLogSink, logMessage } from "@/lib/logging/tauri-log-sink";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);

describe("createTauriLogSink (AC-005 / TC-011)", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
  });

  it("should invoke the log_message command with the exact camel-keyed payload", async () => {
    mockedInvoke.mockResolvedValue(undefined);
    const sink = createTauriLogSink();

    await sink.log("warn", "x");

    expect(mockedInvoke).toHaveBeenCalledWith("log_message", {
      level: "warn",
      message: "x",
    });
  });

  it("should thread each level verbatim into the log_message payload", async () => {
    mockedInvoke.mockResolvedValue(undefined);
    const sink = createTauriLogSink();
    const levels = ["info", "warn", "error", "debug"] as const;

    for (const level of levels) {
      await sink.log(level, `msg-${level}`);
      expect(mockedInvoke).toHaveBeenCalledWith("log_message", {
        level,
        message: `msg-${level}`,
      });
    }
  });

  it("should resolve to undefined and not throw if invoke rejects", async () => {
    mockedInvoke.mockRejectedValue(new Error("not a tauri host"));
    const sink = createTauriLogSink();

    await expect(sink.log("error", "boom")).resolves.toBeUndefined();
  });

  it("should resolve to undefined if invoke resolves", async () => {
    mockedInvoke.mockResolvedValue("some native return value");
    const sink = createTauriLogSink();

    await expect(sink.log("info", "loaded")).resolves.toBeUndefined();
  });
});

describe("logMessage facade (AC-005 / TC-011)", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
  });

  it("should route the level and message to log_message with the exact payload", async () => {
    mockedInvoke.mockResolvedValue(undefined);

    await logMessage("warn", "x");

    expect(mockedInvoke).toHaveBeenCalledWith("log_message", {
      level: "warn",
      message: "x",
    });
  });

  it("should swallow a rejected invoke and resolve undefined when called outside a Tauri host", async () => {
    mockedInvoke.mockRejectedValue(new Error("not a tauri host"));

    await expect(logMessage("error", "boom")).resolves.toBeUndefined();
  });
});

import type { LogSink, LogSinkLevel } from "@pziel/pureui";
import { invoke } from "@tauri-apps/api/core";

export function createTauriLogSink(): LogSink {
  return {
    log: async (level, message) => {
      try {
        await invoke("log_message", { level, message });
      } catch {
        return;
      }
    },
  };
}

const sink = createTauriLogSink();

export function logMessage(
  level: LogSinkLevel,
  message: string,
): Promise<void> {
  return sink.log(level, message);
}

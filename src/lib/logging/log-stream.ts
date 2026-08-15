import { attachLogger } from "@tauri-apps/plugin-log";

export type LogStream = {
  subscribe: (
    onLine: (raw: string, level: number) => void,
  ) => Promise<() => void>;
};

export function createTauriLogStream(): LogStream {
  return {
    subscribe: (onLine) =>
      attachLogger((record) => onLine(record.message, record.level)),
  };
}

export function createNoopLogStream(): LogStream {
  return {
    subscribe: () => Promise.resolve(() => {}),
  };
}

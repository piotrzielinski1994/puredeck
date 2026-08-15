import { describe, expect, it, vi } from "vitest";

// F1 - RED: the noop stream port used by browser/jsdom. `createNoopLogStream`
// does not exist yet - the import fails until `@/lib/logging/log-stream` ships.
import { createNoopLogStream } from "@/lib/logging/log-stream";

describe("createNoopLogStream (AC-009 / TC-010)", () => {
  it("should resolve a callable unsubscribe and never call the listener", async () => {
    const onLine = vi.fn();
    const unsubscribe = await createNoopLogStream().subscribe(onLine);

    expect(onLine).not.toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
  });
});

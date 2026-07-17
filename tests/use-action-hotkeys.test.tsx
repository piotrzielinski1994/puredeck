import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings/settings";
import { useActionHotkeys } from "@/lib/shortcuts/use-action-hotkeys";
import type {
  ShortcutActionId,
  ShortcutOverrides,
} from "@/lib/shortcuts/registry";

function Harness({
  handlers,
}: {
  handlers: Partial<Record<ShortcutActionId, () => void>>;
}) {
  useActionHotkeys(handlers);
  return <span data-testid="ready">ready</span>;
}

async function renderHarness(
  handlers: Partial<Record<ShortcutActionId, () => void>>,
  overrides: ShortcutOverrides = {},
): Promise<void> {
  const seeded: Settings = { ...DEFAULT_SETTINGS, shortcuts: overrides };
  render(
    <HotkeysProvider>
      <SettingsProvider store={createInMemorySettingsStore(seeded)}>
        <Harness handlers={handlers} />
      </SettingsProvider>
    </HotkeysProvider>,
  );
  await screen.findByTestId("ready");
  // The provider loads settings async, then Harness mounts and registers the
  // hotkey in a passive effect. Flush that effect before firing keys so the
  // keydown never races ahead of registration.
  await act(async () => {});
}

afterEach(() => {
  cleanup();
});

describe("useActionHotkeys (AC-010 / TC-009 / E-9)", () => {
  it("should run the handler if the overridden effective binding is pressed", async () => {
    const flip = vi.fn();
    await renderHarness({ "flip-card": flip }, { "flip-card": "Enter" });

    fireEvent.keyDown(document, { key: "Enter", code: "Enter" });

    expect(flip).toHaveBeenCalledTimes(1);
  });

  it("should not run the handler on the registry default if it has been overridden", async () => {
    const flip = vi.fn();
    await renderHarness({ "flip-card": flip }, { "flip-card": "Enter" });

    fireEvent.keyDown(document, { key: " ", code: "Space" });

    expect(flip).not.toHaveBeenCalled();
  });

  it("should run the handler on the registry default if there is no override", async () => {
    const flip = vi.fn();
    await renderHarness({ "flip-card": flip });

    fireEvent.keyDown(document, { key: " ", code: "Space" });

    expect(flip).toHaveBeenCalledTimes(1);
  });

  it("should not register an action whose handler is not supplied", async () => {
    const flip = vi.fn();
    await renderHarness({ "flip-card": flip });

    fireEvent.keyDown(document, { key: "b", code: "KeyB", ctrlKey: true });

    expect(flip).not.toHaveBeenCalled();
  });
});

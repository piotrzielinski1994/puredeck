import { type Hotkey, matchesKeyboardEvent } from "@tanstack/hotkeys";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { eventToHotkey, useRecordHotkey } from "@/lib/shortcuts/record-hotkey";

describe("eventToHotkey (AC-003 / TC-006)", () => {
  it("should record the physical combo if the key composes under mac Option", () => {
    const hotkey = eventToHotkey(
      { metaKey: true, altKey: true, key: "π", code: "KeyP" },
      "mac",
    );

    expect(hotkey).toBe("Mod+Alt+P");
  });

  it("should trust the layout key from event.key if the key is an ASCII letter", () => {
    const hotkey = eventToHotkey(
      { metaKey: true, key: "l", code: "KeyP" },
      "mac",
    );

    expect(hotkey).toBe("Mod+L");
  });

  it("should return null if the event is a Meta modifier-only press", () => {
    expect(
      eventToHotkey({ metaKey: true, key: "Meta", code: "MetaLeft" }, "mac"),
    ).toBeNull();
  });

  it("should return null if the event is a Shift modifier-only press", () => {
    expect(
      eventToHotkey({ shiftKey: true, key: "Shift", code: "ShiftLeft" }, "mac"),
    ).toBeNull();
  });

  it("should return null if the event is a Control modifier-only press", () => {
    expect(
      eventToHotkey(
        { ctrlKey: true, key: "Control", code: "ControlLeft" },
        "mac",
      ),
    ).toBeNull();
  });

  it("should return null if the event is an Alt modifier-only press", () => {
    expect(
      eventToHotkey({ altKey: true, key: "Alt", code: "AltLeft" }, "mac"),
    ).toBeNull();
  });

  it("should record the physical punctuation key if Option composes it on mac", () => {
    const hotkey = eventToHotkey(
      { metaKey: true, altKey: true, key: "–", code: "Minus" },
      "mac",
    );

    expect(hotkey).toBe("Mod+Alt+-");
  });

  it("should produce a hotkey the matcher fires on for a mac Option-composed letter", () => {
    const event = new KeyboardEvent("keydown", {
      metaKey: true,
      altKey: true,
      key: "π",
      code: "KeyP",
    });

    const hotkey = eventToHotkey(event, "mac");

    expect(hotkey).toBe("Mod+Alt+P");
    expect(matchesKeyboardEvent(event, hotkey as Hotkey, "mac")).toBe(true);
  });

  it("should produce a hotkey the matcher fires on for a mac Option-composed punctuation", () => {
    const event = new KeyboardEvent("keydown", {
      metaKey: true,
      altKey: true,
      key: "–",
      code: "Minus",
    });

    const hotkey = eventToHotkey(event, "mac");

    expect(hotkey).toBe("Mod+Alt+-");
    expect(matchesKeyboardEvent(event, hotkey as Hotkey, "mac")).toBe(true);
  });
});

describe("useRecordHotkey (AC-003 / TC-006 / TC-007 / TC-008)", () => {
  it("should not be recording before startRecording is called", () => {
    const onRecord = vi.fn();
    const { result } = renderHook(() => useRecordHotkey({ onRecord }));

    expect(result.current.isRecording).toBe(false);
  });

  it("should be recording after startRecording is called", () => {
    const onRecord = vi.fn();
    const { result } = renderHook(() => useRecordHotkey({ onRecord }));

    act(() => {
      result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
  });

  it("should call onRecord once with the canonical hotkey if a combo is pressed while recording", () => {
    const onRecord = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useRecordHotkey({ onRecord, onCancel }),
    );

    act(() => {
      result.current.startRecording();
    });
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          ctrlKey: true,
          altKey: true,
          key: "π",
          code: "KeyP",
          bubbles: true,
        }),
      );
    });

    expect(onRecord).toHaveBeenCalledTimes(1);
    expect(onRecord).toHaveBeenCalledWith("Mod+Alt+P");
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("should call onCancel and record nothing if Escape is pressed while recording", () => {
    const onRecord = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useRecordHotkey({ onRecord, onCancel }),
    );

    act(() => {
      result.current.startRecording();
    });
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
        }),
      );
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onRecord).not.toHaveBeenCalled();
    expect(result.current.isRecording).toBe(false);
  });

  it("should ignore a modifier-only keydown and keep recording", () => {
    const onRecord = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useRecordHotkey({ onRecord, onCancel }),
    );

    act(() => {
      result.current.startRecording();
    });
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          ctrlKey: true,
          key: "Control",
          code: "ControlLeft",
          bubbles: true,
        }),
      );
    });

    expect(onRecord).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(result.current.isRecording).toBe(true);
  });
});

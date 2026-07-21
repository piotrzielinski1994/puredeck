import {
  detectPlatform,
  isModifierKey,
  normalizeHotkeyFromParsed,
  normalizeKeyName,
  PUNCTUATION_CODE_MAP,
  rawHotkeyToParsedHotkey,
} from "@tanstack/hotkeys";
import { useCallback, useEffect, useRef, useState } from "react";

type Platform = "mac" | "windows" | "linux";

type KeyEventLike = {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  key: string;
  code?: string;
};

function isAsciiLetter(value: string): boolean {
  return /^[A-Za-z]$/.test(value);
}

function physicalKey(event: KeyEventLike): string | null {
  const key: string = normalizeKeyName(event.key);
  const isModifier: boolean = isModifierKey(key);
  if (isModifier) {
    return null;
  }
  if (isAsciiLetter(key)) {
    return key.toUpperCase();
  }
  const code = event.code ?? "";
  if (code.startsWith("Key")) {
    const letter = code.slice(3);
    if (isAsciiLetter(letter)) {
      return letter.toUpperCase();
    }
  }
  if (code.startsWith("Digit")) {
    const digit = code.slice(5);
    if (/^[0-9]$/.test(digit)) {
      return digit;
    }
  }
  if (code in PUNCTUATION_CODE_MAP) {
    return PUNCTUATION_CODE_MAP[code];
  }
  if (key === "Dead" || key.length === 0) {
    return null;
  }
  return key;
}

export function eventToHotkey(
  event: KeyEventLike,
  platform: Platform = detectPlatform(),
): string | null {
  const key = physicalKey(event);
  if (key === null) {
    return null;
  }
  const parsed = rawHotkeyToParsedHotkey(
    {
      key,
      ctrl: event.ctrlKey ?? false,
      shift: event.shiftKey ?? false,
      alt: event.altKey ?? false,
      meta: event.metaKey ?? false,
    },
    platform,
  );
  return normalizeHotkeyFromParsed(parsed, platform);
}

type RecordHotkeyOptions = {
  onRecord: (hotkey: string) => void;
  onCancel?: () => void;
};

type RecordHotkeyApi = {
  isRecording: boolean;
  startRecording: () => void;
  cancelRecording: () => void;
};

export function useRecordHotkey(options: RecordHotkeyOptions): RecordHotkeyApi {
  const [isRecording, setIsRecording] = useState(false);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const startRecording = useCallback(() => setIsRecording(true), []);
  const cancelRecording = useCallback(() => setIsRecording(false), []);

  useEffect(() => {
    if (!isRecording) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        setIsRecording(false);
        optionsRef.current.onCancel?.();
        return;
      }
      const hotkey = eventToHotkey(event);
      if (hotkey === null) {
        return;
      }
      setIsRecording(false);
      optionsRef.current.onRecord(hotkey);
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [isRecording]);

  return { isRecording, startRecording, cancelRecording };
}

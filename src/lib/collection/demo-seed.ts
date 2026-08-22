import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings/settings";
import { seedFileMap } from "@/lib/workspace/collection";
import { DEMO_DECKS } from "@/lib/workspace/demo-data";

// In-memory collection file map for the `npm run dev` browser build. The
// dev-browser build seeds this so the deck collection renders instead of the
// empty state (see `isDevBrowser`). Built through the real `seedFileMap` path
// so the seed can't drift from a shape the loader would reject.
export function demoFiles(): Record<string, string> {
  return seedFileMap(DEMO_DECKS);
}

export function demoSettings(): Settings {
  return { ...DEFAULT_SETTINGS, sidebarCollapsed: false };
}

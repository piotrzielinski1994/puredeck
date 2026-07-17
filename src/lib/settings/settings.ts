import {
  SHORTCUT_ACTIONS,
  type ShortcutActionId,
  type ShortcutOverrides,
} from "@/lib/shortcuts/registry";
import { safeNormalize } from "@/lib/shortcuts/resolve";

export type PanelGroupKey = "workspace";

export type PanelLayout = Record<string, number>;

export type ThemeMode = "light" | "dark" | "system";

export type ThemeSettings = {
  mode: ThemeMode;
};

export type Settings = {
  version: 1;
  layouts: Partial<Record<PanelGroupKey, PanelLayout>>;
  sidebarCollapsed: boolean;
  openTabIds: string[];
  activeTabId: string | null;
  theme: ThemeSettings;
  shortcuts: ShortcutOverrides;
  collectionPath?: string;
};

export type SettingsStore = {
  load: () => Promise<Settings>;
  save: (settings: Settings) => Promise<void>;
};

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  layouts: {},
  sidebarCollapsed: false,
  openTabIds: [],
  activeTabId: null,
  theme: { mode: "system" },
  shortcuts: {},
};

const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "system"];

const GROUP_KEYS: readonly PanelGroupKey[] = ["workspace"];

const ACTION_IDS = new Set<string>(
  SHORTCUT_ACTIONS.map((action) => action.id),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && THEME_MODES.includes(value as ThemeMode);
}

function mergeLayouts(
  base: Settings["layouts"],
  persisted: unknown,
): Settings["layouts"] {
  if (!isRecord(persisted)) {
    return base;
  }
  return GROUP_KEYS.reduce<Settings["layouts"]>((acc, key) => {
    const group = persisted[key];
    if (!isRecord(group)) {
      return acc;
    }
    const sizes = Object.entries(group).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    );
    return sizes.length > 0 ? { ...acc, [key]: Object.fromEntries(sizes) } : acc;
  }, base);
}

function mergeTheme(base: ThemeSettings, persisted: unknown): ThemeSettings {
  if (!isRecord(persisted) || !isThemeMode(persisted.mode)) {
    return base;
  }
  return { mode: persisted.mode };
}

function mergeStringArray(base: string[], persisted: unknown): string[] {
  if (!Array.isArray(persisted)) {
    return base;
  }
  return persisted.filter((item): item is string => typeof item === "string");
}

function mergeShortcuts(persisted: unknown): ShortcutOverrides {
  if (!isRecord(persisted)) {
    return {};
  }
  return Object.entries(persisted).reduce<ShortcutOverrides>(
    (acc, [id, value]) => {
      if (!ACTION_IDS.has(id) || typeof value !== "string") {
        return acc;
      }
      const normalized = safeNormalize(value);
      return normalized === null
        ? acc
        : { ...acc, [id as ShortcutActionId]: normalized };
    },
    {},
  );
}

export function mergeSettings(base: Settings, persisted: unknown): Settings {
  if (!isRecord(persisted)) {
    return base;
  }
  return {
    version: 1,
    layouts: mergeLayouts(base.layouts, persisted.layouts),
    sidebarCollapsed:
      typeof persisted.sidebarCollapsed === "boolean"
        ? persisted.sidebarCollapsed
        : base.sidebarCollapsed,
    openTabIds: mergeStringArray(base.openTabIds, persisted.openTabIds),
    activeTabId:
      typeof persisted.activeTabId === "string"
        ? persisted.activeTabId
        : base.activeTabId,
    theme: mergeTheme(base.theme, persisted.theme),
    shortcuts: mergeShortcuts(persisted.shortcuts),
    collectionPath:
      typeof persisted.collectionPath === "string"
        ? persisted.collectionPath
        : base.collectionPath,
  };
}

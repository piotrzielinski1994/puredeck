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
};

const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "system"];

const GROUP_KEYS: readonly PanelGroupKey[] = ["workspace"];

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
  };
}

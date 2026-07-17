import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SETTINGS,
  type PanelGroupKey,
  type PanelLayout,
  type Settings,
  type SettingsStore,
  type ThemeMode,
} from "@/lib/settings/settings";

type SettingsContextValue = {
  settings: Settings;
  saveLayout: (group: PanelGroupKey, layout: PanelLayout) => void;
  saveSidebarCollapsed: (collapsed: boolean) => void;
  saveOpenTabs: (openTabIds: string[], activeTabId: string | null) => void;
  saveThemeMode: (mode: ThemeMode) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

type SettingsProviderProps = {
  store: SettingsStore;
  children: ReactNode;
};

export function SettingsProvider({ store, children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let isMounted = true;
    store.load().then((loaded) => {
      if (isMounted) {
        setSettings(loaded);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [store]);

  const update = useCallback(
    (mutate: (base: Settings) => Settings) => {
      setSettings((current) => {
        const next = mutate(current ?? DEFAULT_SETTINGS);
        store.save(next);
        return next;
      });
    },
    [store],
  );

  const saveLayout = useCallback(
    (group: PanelGroupKey, layout: PanelLayout) =>
      update((base) => ({
        ...base,
        layouts: { ...base.layouts, [group]: layout },
      })),
    [update],
  );

  const saveSidebarCollapsed = useCallback(
    (collapsed: boolean) =>
      update((base) => ({ ...base, sidebarCollapsed: collapsed })),
    [update],
  );

  const saveOpenTabs = useCallback(
    (openTabIds: string[], activeTabId: string | null) =>
      update((base) => ({ ...base, openTabIds, activeTabId })),
    [update],
  );

  const saveThemeMode = useCallback(
    (mode: ThemeMode) =>
      update((base) => ({ ...base, theme: { ...base.theme, mode } })),
    [update],
  );

  const value = useMemo<SettingsContextValue | null>(() => {
    if (!settings) {
      return null;
    }
    return {
      settings,
      saveLayout,
      saveSidebarCollapsed,
      saveOpenTabs,
      saveThemeMode,
    };
  }, [settings, saveLayout, saveSidebarCollapsed, saveOpenTabs, saveThemeMode]);

  if (!value) {
    return null;
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return value;
}

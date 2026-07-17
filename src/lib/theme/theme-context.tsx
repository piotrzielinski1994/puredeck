import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSettings } from "@/lib/settings/settings-context";
import type { ThemeMode } from "@/lib/settings/settings";
import {
  resolveEffectiveMode,
  type EffectiveMode,
} from "@/lib/theme/effective-mode";

type ThemeContextValue = {
  mode: ThemeMode;
  effectiveMode: EffectiveMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const MEDIA_QUERY = "(prefers-color-scheme: dark)";

function getPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(MEDIA_QUERY).matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, saveThemeMode } = useSettings();
  const mode = settings.theme.mode;

  const [prefersDark, setPrefersDark] = useState(getPrefersDark);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mql = window.matchMedia(MEDIA_QUERY);
    const onChange = (event: MediaQueryListEvent) =>
      setPrefersDark(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const effectiveMode = resolveEffectiveMode(mode, prefersDark);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", effectiveMode === "dark");
  }, [effectiveMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, effectiveMode, setMode: saveThemeMode }),
    [mode, effectiveMode, saveThemeMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return value;
}

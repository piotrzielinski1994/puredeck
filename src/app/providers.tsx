import { useEffect, type ReactNode } from "react";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { installContextMenuSuppressor } from "@/app/suppress-native-context-menu";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => installContextMenuSuppressor(document), []);

  return <HotkeysProvider>{children}</HotkeysProvider>;
}

import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { type ReactNode, useEffect } from "react";
import { installContextMenuSuppressor } from "@/app/suppress-native-context-menu";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => installContextMenuSuppressor(document), []);

  return <HotkeysProvider>{children}</HotkeysProvider>;
}

import { useState } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useHotkey } from "@tanstack/react-hotkeys";
import { CommandPalette } from "@/components/command-palette";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { ThemeProvider } from "@/lib/theme/theme-context";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@/components/workspace/workspace-context";
import { createSettingsStore } from "@/lib/settings/store-factory";

function ShellPalette() {
  const { decks, openDeck, openStudy, openSettings } = useWorkspace();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  useHotkey("Mod+K", (event) => {
    event.preventDefault();
    setIsPaletteOpen((open) => !open);
  });

  const deckCommands = decks.map((deck) => ({
    id: `open-deck-${deck.id}`,
    name: `Open deck: ${deck.name}`,
    run: () => openDeck(deck.id),
  }));

  return (
    <CommandPalette
      open={isPaletteOpen}
      onOpenChange={setIsPaletteOpen}
      commands={[
        { id: "open-settings", name: "Open Settings", run: openSettings },
        ...decks.map((deck) => ({
          id: `study-${deck.id}`,
          name: `Study: ${deck.name}`,
          run: () => openStudy(deck.id),
        })),
        ...deckCommands,
      ]}
    />
  );
}

function RootLayout() {
  const [store] = useState(createSettingsStore);

  return (
    <SettingsProvider store={store}>
      <ThemeProvider>
        <WorkspaceProvider>
          <div className="h-screen">
            <Outlet />
          </div>
          <ShellPalette />
        </WorkspaceProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}

export const rootRoute = createRootRoute({
  component: RootLayout,
});

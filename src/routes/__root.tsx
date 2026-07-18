import { useState } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useActionHotkeys } from "@/lib/shortcuts/use-action-hotkeys";
import { CommandPalette } from "@/components/command-palette";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { ThemeProvider } from "@/lib/theme/theme-context";
import { PaletteProvider, usePalette } from "@/lib/palette/palette-context";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@/components/workspace/workspace-context";
import { createSettingsStore } from "@/lib/settings/store-factory";
import { ToastProvider } from "@/components/ui/toast";

function ShellPalette() {
  const { decks, openDeck, openStudy, openSettings } = useWorkspace();
  const { isOpen: isPaletteOpen, setOpen: setIsPaletteOpen } = usePalette();

  useActionHotkeys({
    "open-command-palette": () => setIsPaletteOpen(!isPaletteOpen),
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
        <PaletteProvider>
          <ToastProvider>
            <WorkspaceProvider>
              <div className="h-screen">
                <Outlet />
              </div>
              <ShellPalette />
            </WorkspaceProvider>
          </ToastProvider>
        </PaletteProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}

export const rootRoute = createRootRoute({
  component: RootLayout,
});

import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import { ToastProvider } from "@/components/ui/toast";
import { DeleteDeckDialog } from "@/components/workspace/delete-deck-dialog";
import {
  useWorkspace,
  WorkspaceProvider,
} from "@/components/workspace/workspace-context";
import { PaletteProvider, usePalette } from "@/lib/palette/palette-context";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createSettingsStore } from "@/lib/settings/store-factory";
import { useActionHotkeys } from "@/lib/shortcuts/use-action-hotkeys";
import { ThemeProvider } from "@/lib/theme/theme-context";

function ShellPalette() {
  const {
    decks,
    openDeck,
    openStudy,
    openSettings,
    createDeck,
    requestDeleteDeck,
  } = useWorkspace();
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
        { id: "new-deck", name: "New deck", run: () => createDeck() },
        { id: "open-settings", name: "Open Settings", run: openSettings },
        ...decks.map((deck) => ({
          id: `study-${deck.id}`,
          name: `Study: ${deck.name}`,
          run: () => openStudy(deck.id),
        })),
        ...deckCommands,
        ...decks.map((deck) => ({
          id: `delete-deck-${deck.id}`,
          name: `Delete deck: ${deck.name}`,
          run: () => requestDeleteDeck(deck.id),
        })),
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
              <DeleteDeckDialog />
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

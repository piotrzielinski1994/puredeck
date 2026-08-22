import {
  CommandPalette,
  createAppVersionGetter,
  createNoopUpdateController,
  createUpdateController,
  UpdateChecker,
  UpdaterProvider,
  useActionHotkeys,
} from "@pziel/pureui";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useState } from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { DeleteDeckDialog } from "@/components/workspace/delete-deck-dialog";
import {
  useWorkspace,
  WorkspaceProvider,
} from "@/components/workspace/workspace-context";
import { demoFiles } from "@/lib/collection/demo-seed";
import {
  createNoopLogStream,
  createTauriLogStream,
} from "@/lib/logging/log-stream";
import { PaletteProvider, usePalette } from "@/lib/palette/palette-context";
import { isDevBrowser } from "@/lib/runtime/environment";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createSettingsStore } from "@/lib/settings/store-factory";
import { useEffectiveShortcuts } from "@/lib/shortcuts/use-effective-shortcuts";
import { ThemeProvider } from "@/lib/theme/theme-context";
import { createPuredeckUpdateToastSink } from "@/lib/updater/update-toast-sink";
import { createInMemoryCollectionStore } from "@/lib/workspace/in-memory-collection";

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

  useActionHotkeys(
    {
      "open-command-palette": () => setIsPaletteOpen(!isPaletteOpen),
    },
    useEffectiveShortcuts(),
    { preventDefault: true },
  );

  const deckCommands = decks.map((deck) => ({
    key: `open-deck-${deck.id}`,
    name: `Open deck: ${deck.name}`,
    run: () => openDeck(deck.id),
  }));

  return (
    <CommandPalette
      open={isPaletteOpen}
      onOpenChange={setIsPaletteOpen}
      commands={[
        { key: "new-deck", name: "New deck", run: () => createDeck() },
        { key: "open-settings", name: "Open Settings", run: openSettings },
        ...decks.map((deck) => ({
          key: `study-${deck.id}`,
          name: `Study: ${deck.name}`,
          run: () => openStudy(deck.id),
        })),
        ...deckCommands,
        ...decks.map((deck) => ({
          key: `delete-deck-${deck.id}`,
          name: `Delete deck: ${deck.name}`,
          run: () => requestDeleteDeck(deck.id),
        })),
      ]}
    />
  );
}

// The Tauri updater/process bindings are injected here because pureui declares
// no @tauri-apps dep; the dev-browser and jsdom (both non-Tauri) get the noop.
function createUpdateControllerForEnv() {
  return isTauri()
    ? createUpdateController({ check, relaunch })
    : createNoopUpdateController();
}

const getAppVersion = createAppVersionGetter({ isTauri, getVersion });

// Bridges the injected controller into the ToastProvider's `show`, so the
// startup checker drives puredeck's own toast presentation (the sink is the
// app-owned half of the DI seam; pureui owns the flow).
function UpdateCheckerBridge({
  controller,
}: {
  controller: ReturnType<typeof createUpdateControllerForEnv>;
}) {
  const { show } = useToast();
  const [sink] = useState(() => createPuredeckUpdateToastSink(show));
  return <UpdateChecker controller={controller} sink={sink} />;
}

function RootLayout() {
  const [store] = useState(createSettingsStore);
  const [updateController] = useState(createUpdateControllerForEnv);
  const [logStream] = useState(() =>
    isTauri() ? createTauriLogStream() : createNoopLogStream(),
  );
  const [collectionStore] = useState(() =>
    isDevBrowser() ? createInMemoryCollectionStore(demoFiles()) : undefined,
  );

  return (
    <SettingsProvider store={store}>
      <ThemeProvider>
        <PaletteProvider>
          <ToastProvider>
            <UpdaterProvider
              controller={updateController}
              getVersion={getAppVersion}
            >
              <WorkspaceProvider logStream={logStream} store={collectionStore}>
                <div className="h-screen">
                  <Outlet />
                </div>
                <ShellPalette />
                <DeleteDeckDialog />
              </WorkspaceProvider>
              <UpdateCheckerBridge controller={updateController} />
            </UpdaterProvider>
          </ToastProvider>
        </PaletteProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}

export const rootRoute = createRootRoute({
  component: RootLayout,
});

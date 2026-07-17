import { useHotkey } from "@tanstack/react-hotkeys";
import { useSettings } from "@/lib/settings/settings-context";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { ContentTabs } from "@/components/workspace/content-tabs";
import { DeckView } from "@/components/workspace/deck-view";
import { StudyView } from "@/components/workspace/study-view";
import { SettingsView } from "@/components/workspace/settings-view";

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <p className="text-base font-medium text-foreground">No deck open</p>
      <p>Pick a deck on the left, or create one to begin.</p>
    </div>
  );
}

function ActiveSurface() {
  const { tabs, activeTabId, deckById, openStudy } = useWorkspace();
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;

  if (!activeTab) {
    return <EmptyState />;
  }
  if (activeTab.kind === "settings") {
    return <SettingsView />;
  }
  const deck = activeTab.deckId ? deckById(activeTab.deckId) : undefined;
  if (!deck) {
    return <EmptyState />;
  }
  if (activeTab.kind === "study") {
    return <StudyView deck={deck} />;
  }
  return <DeckView deck={deck} onStudy={() => openStudy(deck.id)} />;
}

export function Main() {
  const { settings, saveSidebarCollapsed } = useSettings();

  useHotkey("Mod+B", (event) => {
    event.preventDefault();
    saveSidebarCollapsed(!settings.sidebarCollapsed);
  });

  return (
    <div className="flex h-full flex-col">
      <ContentTabs />
      <div className="min-h-0 flex-1">
        <ActiveSurface />
      </div>
    </div>
  );
}

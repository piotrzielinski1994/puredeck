import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/workspace/workspace-context";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { decks, selectedDeckId, openDeck } = useWorkspace();

  const handleOpen = (deckId: string) => {
    openDeck(deckId);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div className="flex h-9 shrink-0 items-center border-b pl-3 text-sm font-semibold">
        puredeck
      </div>
      <nav aria-label="Decks" className="flex flex-col overflow-y-auto py-1">
        {decks.length === 0 ? (
          <p className="px-3 py-1 text-sm text-muted-foreground">No decks yet</p>
        ) : (
          decks.map((deck) => (
            <button
              key={deck.id}
              type="button"
              aria-current={deck.id === selectedDeckId}
              onClick={() => handleOpen(deck.id)}
              className={cn(
                "flex min-h-11 items-center px-3 py-1 text-left text-[13px] whitespace-nowrap hover:bg-accent md:min-h-0",
                deck.id === selectedDeckId && "bg-accent",
              )}
            >
              {deck.name}
            </button>
          ))
        )}
      </nav>
    </div>
  );
}

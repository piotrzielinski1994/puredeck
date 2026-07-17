import { GraduationCap } from "lucide-react";
import { CardGrid } from "@/components/workspace/card-grid";
import type { Deck } from "@/lib/workspace/model";

export function DeckView({
  deck,
  onStudy,
}: {
  deck: Deck;
  onStudy?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-stretch border-b bg-muted/30">
        <div className="flex flex-1 items-center gap-2 px-3 text-sm font-semibold">
          {deck.name}
          <span className="font-normal text-muted-foreground">
            {deck.cards.length} cards
          </span>
        </div>
        <button
          type="button"
          aria-label="Study"
          title="Study"
          onClick={onStudy}
          className="flex h-full w-10 items-center justify-center border-l bg-primary text-primary-foreground hover:brightness-90"
        >
          <GraduationCap className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <CardGrid cards={deck.cards} />
      </div>
    </div>
  );
}

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/workspace/model";

const CELL = "border-r border-b border-border bg-background";
const INPUT =
  "h-9 w-full bg-background px-2.5 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset";

export function CardGrid({ cards }: { cards: Card[] }) {
  return (
    <div
      role="grid"
      aria-label="Cards"
      className="grid border-t border-l border-border"
      style={{ gridTemplateColumns: "1fr 1fr 2.25rem" }}
    >
      {cards.map((card) => (
        <div key={card.id} className="contents">
          <div className={CELL}>
            <input
              aria-label={`Front of ${card.front}`}
              defaultValue={card.front}
              className={INPUT}
            />
          </div>
          <div className={CELL}>
            <input
              aria-label={`Back of ${card.front}`}
              defaultValue={card.back}
              className={INPUT}
            />
          </div>
          <div className={cn(CELL, "flex items-center justify-center")}>
            <button
              type="button"
              aria-label={`Remove ${card.front}`}
              className="flex items-center text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
      <div className={CELL}>
        <input aria-label="New card front" placeholder="front" className={INPUT} />
      </div>
      <div className={CELL}>
        <input aria-label="New card back" placeholder="back" className={INPUT} />
      </div>
      <div className={CELL} />
    </div>
  );
}

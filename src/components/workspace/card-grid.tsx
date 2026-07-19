import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/workspace/model";

const CELL = "border-r border-b border-border bg-background";
const INPUT =
  "h-9 w-full bg-background px-2.5 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset";
const NO_AUTOFILL = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
} as const;

type CardGridProps = {
  cards: Card[];
  onEditCard: (
    id: string,
    patch: Partial<Pick<Card, "front" | "back">>,
  ) => void;
  onRemoveCard: (id: string) => void;
  onAddCard: (front: string, back: string) => void;
};

export function CardGrid({
  cards,
  onEditCard,
  onRemoveCard,
  onAddCard,
}: CardGridProps) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const commitAdd = (): void => {
    const trimmedFront = front.trim();
    const trimmedBack = back.trim();
    if (trimmedFront === "" || trimmedBack === "") {
      return;
    }
    onAddCard(trimmedFront, trimmedBack);
    setFront("");
    setBack("");
  };

  const commitEdit = (
    card: Card,
    field: "front" | "back",
    value: string,
  ): void => {
    if (value === card[field]) {
      return;
    }
    onEditCard(card.id, { [field]: value });
  };

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
              onBlur={(event) => commitEdit(card, "front", event.target.value)}
              className={INPUT}
              {...NO_AUTOFILL}
            />
          </div>
          <div className={CELL}>
            <input
              aria-label={`Back of ${card.front}`}
              defaultValue={card.back}
              onBlur={(event) => commitEdit(card, "back", event.target.value)}
              className={INPUT}
              {...NO_AUTOFILL}
            />
          </div>
          <div className={cn(CELL, "flex items-center justify-center")}>
            <button
              type="button"
              aria-label={`Remove ${card.front}`}
              onClick={() => onRemoveCard(card.id)}
              className="flex items-center text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
      <div className={CELL}>
        <input
          aria-label="New card front"
          placeholder="front"
          value={front}
          onChange={(event) => setFront(event.target.value)}
          onBlur={commitAdd}
          className={INPUT}
          {...NO_AUTOFILL}
        />
      </div>
      <div className={CELL}>
        <input
          aria-label="New card back"
          placeholder="back"
          value={back}
          onChange={(event) => setBack(event.target.value)}
          onBlur={commitAdd}
          className={INPUT}
          {...NO_AUTOFILL}
        />
      </div>
      <div className={CELL} />
    </div>
  );
}

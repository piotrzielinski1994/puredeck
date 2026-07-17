import { useState } from "react";
import { useActionHotkeys } from "@/lib/shortcuts/use-action-hotkeys";
import type { Deck } from "@/lib/workspace/model";

const GRADES = ["Again", "Hard", "Good"] as const;

export function StudyView({ deck }: { deck: Deck }) {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const card = deck.cards[index];

  const flip = () => setIsFlipped(true);

  const grade = () => {
    setIsFlipped(false);
    setIndex((current) => (current + 1) % deck.cards.length);
  };

  useActionHotkeys({ "flip-card": flip });

  if (!card) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No cards to study.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-6">
      <p className="text-xs tracking-wide text-muted-foreground">
        Card {index + 1} / {deck.cards.length}
      </p>
      <button
        type="button"
        aria-label="Flip card"
        onClick={flip}
        className="flex min-h-52 w-full max-w-md flex-col items-center justify-center gap-4 border bg-card p-8"
      >
        <span className="text-3xl font-medium">{card.front}</span>
        {isFlipped && (
          <>
            <span className="h-px w-14 bg-border" />
            <span className="text-xl text-muted-foreground">{card.back}</span>
          </>
        )}
      </button>
      {isFlipped && (
        <div className="flex gap-2">
          {GRADES.map((label) => (
            <button
              key={label}
              type="button"
              onClick={grade}
              className="min-w-20 border px-3 py-1.5 text-center text-sm font-medium hover:bg-accent"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

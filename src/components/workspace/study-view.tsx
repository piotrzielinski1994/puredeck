import { useState } from "react";
import { useActionHotkeys } from "@/lib/shortcuts/use-action-hotkeys";
import type { Card, Deck } from "@/lib/workspace/model";
import {
  Rating,
  type Card as FsrsCard,
  type Grade,
  type ReviewMap,
} from "@/lib/study/fsrs";
import { buildStudyQueue, nowDate } from "@/lib/study/queue";

const GRADES = [
  ["Again", Rating.Again],
  ["Hard", Rating.Hard],
  ["Good", Rating.Good],
  ["Easy", Rating.Easy],
] as const satisfies readonly (readonly [string, Grade])[];

function isSameDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

export function StudyView({
  deck,
  reviews,
  onGrade,
  now = nowDate(),
}: {
  deck: Deck;
  reviews: ReviewMap;
  onGrade: (cardId: string, grade: Grade) => FsrsCard;
  now?: Date;
}) {
  const [queue, setQueue] = useState<Card[]>(() =>
    buildStudyQueue(deck, reviews, now),
  );
  const [isFlipped, setIsFlipped] = useState(false);

  const card = queue[0];

  const flip = () => setIsFlipped(true);

  const grade = (value: Grade) => {
    setIsFlipped(false);
    const scheduled = onGrade(card.id, value);
    setQueue((current) =>
      isSameDay(scheduled.due, now)
        ? [...current.slice(1), current[0]]
        : current.slice(1),
    );
  };

  useActionHotkeys({ "flip-card": flip });

  if (deck.cards.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No cards to study.
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p className="text-base font-medium text-foreground">All caught up</p>
        <p>No cards due for review.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-6">
      <p className="text-xs tracking-wide text-muted-foreground">
        {queue.length} due
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
        <div className="flex flex-wrap justify-center gap-2">
          {GRADES.map(([label, value]) => (
            <button
              key={label}
              type="button"
              onClick={() => grade(value)}
              className="min-h-11 min-w-20 border px-3 py-1.5 text-center text-sm font-medium hover:bg-accent md:min-h-0"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

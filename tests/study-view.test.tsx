import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StudyView } from "@/components/workspace/study-view";
import type { Deck } from "@/lib/workspace/model";
import {
  newCard,
  Rating,
  type Card as FsrsCard,
  type Grade,
  type ReviewMap,
} from "@/lib/study/fsrs";

const NOW = new Date("2026-07-19T12:00:00Z");
const SAME_DAY_DUE = new Date("2026-07-19T12:06:00Z");
const NEXT_DAY_DUE = new Date("2026-07-20T12:00:00Z");
const FUTURE_DUE = new Date("2026-07-28T12:00:00Z");

function fsrsCardDueAt(due: Date): FsrsCard {
  return { ...newCard(NOW), due };
}

function dropOnGrade(): FsrsCard {
  return fsrsCardDueAt(NEXT_DAY_DUE);
}

const deck: Deck = {
  id: "es",
  name: "Spanish",
  cards: [
    { id: "c1", front: "gato", back: "cat" },
    { id: "c2", front: "hola", back: "hello" },
  ],
};

afterEach(() => {
  cleanup();
});

describe("StudyView flip behavior (AC-008)", () => {
  it("should show the front of the first due card and hide all four grade buttons before flipping", () => {
    render(
      <StudyView deck={deck} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    expect(screen.getByText("gato")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /again/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /hard/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /good/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /easy/i }),
    ).not.toBeInTheDocument();
  });

  it("should reveal the back and show all four grade buttons when the card is clicked", () => {
    render(
      <StudyView deck={deck} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    fireEvent.click(screen.getByText("gato"));

    expect(screen.getByText("cat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /good/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /easy/i })).toBeInTheDocument();
  });

  it("should reveal the back and grade buttons when Space is pressed", () => {
    render(
      <StudyView deck={deck} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    expect(
      screen.queryByRole("button", { name: /good/i }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: " ", code: "Space" });

    expect(screen.getByText("cat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /good/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /easy/i })).toBeInTheDocument();
  });
});

describe("StudyView grade dispatch (TC-012 / AC-008)", () => {
  it("should call onGrade with the current card id and Rating.Easy when Easy is clicked", () => {
    const onGrade =
      vi.fn<(cardId: string, grade: Grade) => FsrsCard>(dropOnGrade);
    render(<StudyView deck={deck} reviews={{}} onGrade={onGrade} now={NOW} />);

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /easy/i }));

    expect(onGrade).toHaveBeenCalledWith("c1", Rating.Easy);
    expect(Rating.Easy).toBe(4);
  });
});

describe("StudyView requeue on same-day due (TC-011 / AC-007)", () => {
  it("should requeue the card to the back of the session when the returned due is the same calendar day", () => {
    const onGrade = vi
      .fn<(cardId: string, grade: Grade) => FsrsCard>()
      .mockReturnValueOnce(fsrsCardDueAt(SAME_DAY_DUE))
      .mockReturnValueOnce(fsrsCardDueAt(NEXT_DAY_DUE));
    render(<StudyView deck={deck} reviews={{}} onGrade={onGrade} now={NOW} />);

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(onGrade).toHaveBeenNthCalledWith(1, "c1", Rating.Good);
    expect(screen.getByText("hola")).toBeInTheDocument();
    expect(screen.queryByText("gato")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("hola"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(onGrade).toHaveBeenNthCalledWith(2, "c2", Rating.Good);
    expect(screen.getByText("gato")).toBeInTheDocument();
    expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument();
  });
});

describe("StudyView completion after grading away every due card (TC-010 / AC-007)", () => {
  it("should show the All caught up state with no card and no grade buttons when every returned due is a later day", () => {
    const onGrade =
      vi.fn<(cardId: string, grade: Grade) => FsrsCard>(dropOnGrade);
    render(<StudyView deck={deck} reviews={{}} onGrade={onGrade} now={NOW} />);

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(screen.getByText("hola")).toBeInTheDocument();

    fireEvent.click(screen.getByText("hola"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /good/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("gato")).not.toBeInTheDocument();
    expect(screen.queryByText("hola")).not.toBeInTheDocument();
  });
});

describe("StudyView completion at mount (TC-010 / AC-007)", () => {
  it("should show All caught up immediately when the only card is scheduled for a future day", () => {
    const reviews: ReviewMap = { c1: fsrsCardDueAt(FUTURE_DUE) };
    const single: Deck = { id: "es", name: "Spanish", cards: [deck.cards[0]] };

    render(
      <StudyView
        deck={single}
        reviews={reviews}
        onGrade={dropOnGrade}
        now={NOW}
      />,
    );

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.queryByText("gato")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /good/i }),
    ).not.toBeInTheDocument();
  });
});

describe("StudyView rebuilds the queue when reviews load late (cold start)", () => {
  it("should exclude a now-future card once reviews arrive after the initial empty mount", () => {
    const single: Deck = { id: "es", name: "Spanish", cards: [deck.cards[0]] };
    const { rerender } = render(
      <StudyView deck={single} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    expect(screen.getByText("gato")).toBeInTheDocument();

    rerender(
      <StudyView
        deck={single}
        reviews={{ c1: fsrsCardDueAt(FUTURE_DUE) }}
        onGrade={dropOnGrade}
        now={NOW}
      />,
    );

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.queryByText("gato")).not.toBeInTheDocument();
  });
});

describe("StudyView empty deck (unchanged message)", () => {
  it("should show the No cards to study message when the deck has no cards", () => {
    const empty: Deck = { id: "es", name: "Spanish", cards: [] };
    render(
      <StudyView deck={empty} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    expect(screen.getByText(/no cards to study/i)).toBeInTheDocument();
  });
});

const bodyText = () => document.body.textContent ?? "";

const REMAINING = (n: number) =>
  new RegExp(`${n}\\s*(cards?\\s*)?(left|remaining|to go)`, "i");

describe("StudyView session progress readout (F5 TC-001/TC-002 / AC-001)", () => {
  it("should show reviewed 0 and 2 remaining if the session starts with two due cards", () => {
    render(
      <StudyView deck={deck} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    expect(bodyText()).toMatch(/reviewed\D*0/i);
    expect(bodyText()).toMatch(REMAINING(2));
    expect(screen.queryByText(/accuracy/i)).not.toBeInTheDocument();
  });

  it("should show reviewed 1 and 1 remaining if the first of two due cards is graded", () => {
    render(
      <StudyView deck={deck} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(bodyText()).toMatch(/reviewed\D*1/i);
    expect(bodyText()).toMatch(REMAINING(1));
    expect(screen.queryByText(/accuracy/i)).not.toBeInTheDocument();
  });
});

describe("StudyView completion summary (F5 TC-003/TC-008 / AC-002/AC-003)", () => {
  it("should break down the ratings as Again 1 Hard 0 Good 1 Easy 0 if two cards are graded to completion", () => {
    render(
      <StudyView deck={deck} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));
    fireEvent.click(screen.getByText("hola"));
    fireEvent.click(screen.getByRole("button", { name: /again/i }));

    expect(bodyText()).toMatch(/reviewed\D*2/i);
    expect(bodyText()).toMatch(/again\D*1/i);
    expect(bodyText()).toMatch(/hard\D*0/i);
    expect(bodyText()).toMatch(/good\D*1/i);
    expect(bodyText()).toMatch(/easy\D*0/i);
  });

  it("should show the completion summary and hide the card and grade buttons if every due card is graded away", () => {
    render(
      <StudyView deck={deck} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));
    fireEvent.click(screen.getByText("hola"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(bodyText()).toMatch(/reviewed\D*2/i);
    expect(bodyText()).toMatch(/accuracy/i);
    expect(bodyText()).toMatch(/\b100\s*%/);
    expect(screen.queryByText("gato")).not.toBeInTheDocument();
    expect(screen.queryByText("hola")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /again/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /good/i }),
    ).not.toBeInTheDocument();
  });
});

describe("StudyView requeued card counts twice (F5 TC-004 / AC-002/E-2)", () => {
  it("should count a same-day requeued card graded twice as two reviews if the session completes", () => {
    const onGrade = vi
      .fn<(cardId: string, grade: Grade) => FsrsCard>()
      .mockReturnValueOnce(fsrsCardDueAt(SAME_DAY_DUE))
      .mockReturnValueOnce(fsrsCardDueAt(NEXT_DAY_DUE))
      .mockReturnValueOnce(fsrsCardDueAt(NEXT_DAY_DUE));
    render(<StudyView deck={deck} reviews={{}} onGrade={onGrade} now={NOW} />);

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /again/i }));

    fireEvent.click(screen.getByText("hola"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(bodyText()).toMatch(/reviewed\D*3/i);
    expect(bodyText()).toMatch(/again\D*1/i);
    expect(bodyText()).toMatch(/good\D*2/i);
  });
});

describe("StudyView accuracy (F5 TC-005 / AC-003)", () => {
  it("should report accuracy 75 percent if three cards are Good and one is Again", () => {
    const deck4: Deck = {
      id: "es",
      name: "Spanish",
      cards: [
        { id: "c1", front: "uno", back: "one" },
        { id: "c2", front: "dos", back: "two" },
        { id: "c3", front: "tres", back: "three" },
        { id: "c4", front: "cuatro", back: "four" },
      ],
    };

    render(
      <StudyView deck={deck4} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    fireEvent.click(screen.getByText("uno"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));
    fireEvent.click(screen.getByText("dos"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));
    fireEvent.click(screen.getByText("tres"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));
    fireEvent.click(screen.getByText("cuatro"));
    fireEvent.click(screen.getByRole("button", { name: /again/i }));

    expect(bodyText()).toMatch(/reviewed\D*4/i);
    expect(bodyText()).toMatch(/good\D*3/i);
    expect(bodyText()).toMatch(/again\D*1/i);
    expect(bodyText()).toMatch(/accuracy/i);
    expect(bodyText()).toMatch(/\b75\s*%/);
  });
});

describe("StudyView accuracy all-Again (F5 E-4 / AC-003)", () => {
  it("should report accuracy 0 percent and still show the summary if every card is graded Again", () => {
    const onGrade = vi
      .fn<(cardId: string, grade: Grade) => FsrsCard>()
      .mockReturnValue(fsrsCardDueAt(NEXT_DAY_DUE));
    render(<StudyView deck={deck} reviews={{}} onGrade={onGrade} now={NOW} />);

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /again/i }));
    fireEvent.click(screen.getByText("hola"));
    fireEvent.click(screen.getByRole("button", { name: /again/i }));

    expect(bodyText()).toMatch(/reviewed\D*2/i);
    expect(bodyText()).toMatch(/again\D*2/i);
    expect(bodyText()).toMatch(/accuracy/i);
    expect(bodyText()).toMatch(/\b0\s*%/);
  });
});

describe("StudyView no summary without work (F5 TC-006/TC-007 / AC-004/AC-005)", () => {
  it("should show no summary if the queue is empty at mount with zero grades", () => {
    const single: Deck = { id: "es", name: "Spanish", cards: [deck.cards[0]] };
    render(
      <StudyView
        deck={single}
        reviews={{ c1: fsrsCardDueAt(FUTURE_DUE) }}
        onGrade={dropOnGrade}
        now={NOW}
      />,
    );

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(bodyText()).not.toMatch(/reviewed\s*\d/i);
    expect(screen.queryByText(/accuracy/i)).not.toBeInTheDocument();
  });

  it("should show no progress readout or summary if the deck has no cards", () => {
    const empty: Deck = { id: "es", name: "Spanish", cards: [] };
    render(
      <StudyView deck={empty} reviews={{}} onGrade={dropOnGrade} now={NOW} />,
    );

    expect(screen.getByText(/no cards to study/i)).toBeInTheDocument();
    expect(bodyText()).not.toMatch(/reviewed\s*\d/i);
    expect(screen.queryByText(/accuracy/i)).not.toBeInTheDocument();
  });
});

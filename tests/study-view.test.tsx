import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StudyView } from "@/components/workspace/study-view";
import type { Deck } from "@/lib/workspace/model";

const TODAY = "2026-07-19";

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

describe("StudyView flip behavior (AC-005)", () => {
  it("should show the front of the first due card and hide the grade buttons before flipping", () => {
    render(
      <StudyView deck={deck} reviews={{}} onGrade={() => {}} today={TODAY} />,
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
  });

  it("should reveal the back and show grade buttons when the card is clicked", () => {
    render(
      <StudyView deck={deck} reviews={{}} onGrade={() => {}} today={TODAY} />,
    );

    fireEvent.click(screen.getByText("gato"));

    expect(screen.getByText("cat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /good/i })).toBeInTheDocument();
  });

  it("should reveal the back when Space is pressed", () => {
    render(
      <StudyView deck={deck} reviews={{}} onGrade={() => {}} today={TODAY} />,
    );

    expect(
      screen.queryByRole("button", { name: /good/i }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: " ", code: "Space" });

    expect(screen.getByText("cat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /good/i })).toBeInTheDocument();
  });
});

describe("StudyView completion (AC-005 / AC-007 / TC-009)", () => {
  it("should show the All caught up state with no card and no grade buttons after every due card is graded Good", () => {
    render(
      <StudyView deck={deck} reviews={{}} onGrade={() => {}} today={TODAY} />,
    );

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(screen.getByText("hola")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /good/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("hola"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /good/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("gato")).not.toBeInTheDocument();
    expect(screen.queryByText("hola")).not.toBeInTheDocument();
  });

  it("should show All caught up immediately when the only card is scheduled for a future day (TC-008/AC-007)", () => {
    const reviews = {
      c1: { ease: 2.5, intervalDays: 10, reps: 3, due: "2026-08-01" },
    };
    const single: Deck = { id: "es", name: "Spanish", cards: [deck.cards[0]] };

    render(
      <StudyView
        deck={single}
        reviews={reviews}
        onGrade={() => {}}
        today={TODAY}
      />,
    );

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.queryByText("gato")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /good/i }),
    ).not.toBeInTheDocument();
  });
});

describe("StudyView Again requeue (AC-006 / TC-010)", () => {
  it("should call onGrade and requeue the current card to the back of the session when Again is graded", () => {
    const onGrade = vi.fn();
    render(
      <StudyView deck={deck} reviews={{}} onGrade={onGrade} today={TODAY} />,
    );

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /again/i }));

    expect(onGrade).toHaveBeenCalledWith("c1", "Again");
    expect(screen.getByText("hola")).toBeInTheDocument();
    expect(screen.queryByText("gato")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("hola"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(screen.getByText("gato")).toBeInTheDocument();
    expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument();
  });
});

describe("StudyView Hard drops the card (AC-006)", () => {
  it("should drop the current card from the session when Hard is graded, not requeue it", () => {
    const onGrade = vi.fn();
    render(
      <StudyView deck={deck} reviews={{}} onGrade={onGrade} today={TODAY} />,
    );

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /hard/i }));

    expect(onGrade).toHaveBeenCalledWith("c1", "Hard");
    expect(screen.getByText("hola")).toBeInTheDocument();

    fireEvent.click(screen.getByText("hola"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.queryByText("gato")).not.toBeInTheDocument();
  });
});

describe("StudyView empty deck (unchanged message)", () => {
  it("should show the No cards to study message when the deck has no cards", () => {
    const empty: Deck = { id: "es", name: "Spanish", cards: [] };
    render(
      <StudyView deck={empty} reviews={{}} onGrade={() => {}} today={TODAY} />,
    );

    expect(screen.getByText(/no cards to study/i)).toBeInTheDocument();
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DeckView } from "@/components/workspace/deck-view";
import type { Deck } from "@/lib/workspace/model";

const deck: Deck = {
  id: "es",
  name: "Spanish",
  cards: [
    { id: "c1", front: "hola", back: "hello" },
    { id: "c2", front: "gato", back: "cat" },
    { id: "c3", front: "perro", back: "dog" },
  ],
};

afterEach(() => {
  cleanup();
});

describe("DeckView (AC-005 / TC-005)", () => {
  it("should render the deck title and card count in the pane toolbar", () => {
    render(<DeckView deck={deck} />);

    expect(screen.getByText("Spanish")).toBeInTheDocument();
    expect(screen.getByText(/3 cards/i)).toBeInTheDocument();
  });

  it("should render an editable grid row per card showing front and back values", () => {
    render(<DeckView deck={deck} />);

    expect(screen.getByDisplayValue("hola")).toBeInTheDocument();
    expect(screen.getByDisplayValue("hello")).toBeInTheDocument();
    expect(screen.getByDisplayValue("gato")).toBeInTheDocument();
    expect(screen.getByDisplayValue("cat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("perro")).toBeInTheDocument();
    expect(screen.getByDisplayValue("dog")).toBeInTheDocument();
  });

  it("should render an icon-only Study action in the toolbar", () => {
    render(<DeckView deck={deck} />);

    expect(
      screen.getByRole("button", { name: /study/i }),
    ).toBeInTheDocument();
  });

  it("should render a trailing blank input row for adding a card", () => {
    render(<DeckView deck={deck} />);

    const isEmptyInput = (el: HTMLElement): boolean =>
      el instanceof HTMLInputElement && el.value === "";

    expect(screen.getAllByPlaceholderText("front").some(isEmptyInput)).toBe(
      true,
    );
    expect(screen.getAllByPlaceholderText("back").some(isEmptyInput)).toBe(
      true,
    );
  });
});

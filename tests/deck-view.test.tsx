import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("DeckView editing wiring (AC-001 / AC-003 / AC-004 / E-4)", () => {
  it("should save the deck with the edited card front if a front is changed and blurred", async () => {
    const user = userEvent.setup();
    const onSaveDeck = vi.fn();
    render(
      <>
        <DeckView deck={deck} onSaveDeck={onSaveDeck} />
        <button type="button">outside</button>
      </>,
    );

    const front = screen.getByLabelText("Front of hola");
    await user.clear(front);
    await user.type(front, "adios");
    await user.click(screen.getByText("outside"));

    expect(onSaveDeck).toHaveBeenCalledTimes(1);
    const saved: Deck = onSaveDeck.mock.calls[0][0];
    expect(saved.cards.find((card) => card.id === "c1")).toEqual({
      id: "c1",
      front: "adios",
      back: "hello",
    });
    expect(saved.cards).toHaveLength(deck.cards.length);
  });

  it("should save the deck with the edited card front cleared to empty on edit", async () => {
    const user = userEvent.setup();
    const onSaveDeck = vi.fn();
    render(
      <>
        <DeckView deck={deck} onSaveDeck={onSaveDeck} />
        <button type="button">outside</button>
      </>,
    );

    const front = screen.getByLabelText("Front of hola");
    await user.clear(front);
    await user.click(screen.getByText("outside"));

    expect(onSaveDeck).toHaveBeenCalledTimes(1);
    const saved: Deck = onSaveDeck.mock.calls[0][0];
    expect(saved.cards.find((card) => card.id === "c1")?.front).toBe("");
  });

  it("should save the deck without the removed card if a trash button is clicked", async () => {
    const user = userEvent.setup();
    const onSaveDeck = vi.fn();
    render(<DeckView deck={deck} onSaveDeck={onSaveDeck} />);

    await user.click(screen.getByRole("button", { name: "Remove hola" }));

    expect(onSaveDeck).toHaveBeenCalledTimes(1);
    const saved: Deck = onSaveDeck.mock.calls[0][0];
    expect(saved.cards.map((card) => card.id)).toEqual(["c2", "c3"]);
  });

  it("should save the deck with a new card and clear the add-row if both add fields are committed", async () => {
    const user = userEvent.setup();
    const onSaveDeck = vi.fn();
    render(
      <>
        <DeckView deck={deck} onSaveDeck={onSaveDeck} />
        <button type="button">outside</button>
      </>,
    );

    await user.type(screen.getByLabelText("New card front"), "perro");
    await user.type(screen.getByLabelText("New card back"), "dog");
    await user.click(screen.getByText("outside"));

    expect(onSaveDeck).toHaveBeenCalledTimes(1);
    const saved: Deck = onSaveDeck.mock.calls[0][0];
    expect(saved.cards).toHaveLength(deck.cards.length + 1);
    const added = saved.cards[saved.cards.length - 1];
    expect(added.front).toBe("perro");
    expect(added.back).toBe("dog");
    expect(
      (screen.getByLabelText("New card front") as HTMLInputElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText("New card back") as HTMLInputElement).value,
    ).toBe("");
  });
});

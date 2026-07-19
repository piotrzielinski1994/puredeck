import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardGrid } from "@/components/workspace/card-grid";
import type { Card } from "@/lib/workspace/model";

const cards: Card[] = [
  { id: "c1", front: "hola", back: "hello" },
  { id: "c2", front: "gato", back: "cat" },
];

function renderGrid() {
  const onEditCard = vi.fn();
  const onRemoveCard = vi.fn();
  const onAddCard = vi.fn();
  render(
    <>
      <CardGrid
        cards={cards}
        onEditCard={onEditCard}
        onRemoveCard={onRemoveCard}
        onAddCard={onAddCard}
      />
      <button type="button">outside</button>
    </>,
  );
  const blur = async (
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> => {
    await user.click(screen.getByText("outside"));
  };
  return { onEditCard, onRemoveCard, onAddCard, blur };
}

afterEach(() => {
  cleanup();
});

describe("CardGrid controlled (TC-001..TC-005)", () => {
  it("should call onEditCard with the card id and new front if an existing front is changed and blurred", async () => {
    const user = userEvent.setup();
    const { onEditCard, blur } = renderGrid();

    const front = screen.getByLabelText("Front of hola");
    await user.clear(front);
    await user.type(front, "adios");
    await blur(user);

    expect(onEditCard).toHaveBeenCalledTimes(1);
    expect(onEditCard).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ front: "adios" }),
    );
  });

  it("should not call onEditCard if an input is blurred without a value change", async () => {
    const user = userEvent.setup();
    const { onEditCard, blur } = renderGrid();

    const back = screen.getByLabelText("Back of hola");
    await user.click(back);
    await blur(user);

    expect(onEditCard).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Front of gato"), "X");
    await blur(user);

    expect(onEditCard).toHaveBeenCalledTimes(1);
    expect(onEditCard).toHaveBeenCalledWith(
      "c2",
      expect.objectContaining({ front: expect.stringContaining("X") }),
    );
  });

  it("should call onRemoveCard with the card id if the row trash button is clicked", async () => {
    const user = userEvent.setup();
    const { onRemoveCard } = renderGrid();

    await user.click(screen.getByRole("button", { name: "Remove hola" }));

    expect(onRemoveCard).toHaveBeenCalledTimes(1);
    expect(onRemoveCard).toHaveBeenCalledWith("c1");
  });

  it("should call onAddCard with the trimmed front and back if the add-row is completed and committed", async () => {
    const user = userEvent.setup();
    const { onAddCard, blur } = renderGrid();

    await user.type(screen.getByLabelText("New card front"), "  perro  ");
    await user.type(screen.getByLabelText("New card back"), "  dog  ");
    await blur(user);

    expect(onAddCard).toHaveBeenCalledTimes(1);
    expect(onAddCard).toHaveBeenCalledWith("perro", "dog");
  });

  it("should not call onAddCard if the add-row back is empty and should keep the typed front", async () => {
    const user = userEvent.setup();
    const { onAddCard, blur } = renderGrid();

    await user.type(screen.getByLabelText("New card front"), "solo");
    await blur(user);

    expect(onAddCard).not.toHaveBeenCalled();
    expect(
      (screen.getByLabelText("New card front") as HTMLInputElement).value,
    ).toBe("solo");

    await user.type(screen.getByLabelText("New card back"), "alone");
    await blur(user);

    expect(onAddCard).toHaveBeenCalledTimes(1);
    expect(onAddCard).toHaveBeenCalledWith("solo", "alone");
  });

  it("should not call onAddCard if both add fields are whitespace-only", async () => {
    const user = userEvent.setup();
    const { onAddCard, blur } = renderGrid();

    await user.type(screen.getByLabelText("New card front"), "   ");
    await user.type(screen.getByLabelText("New card back"), "   ");
    await blur(user);

    expect(onAddCard).not.toHaveBeenCalled();
  });
});

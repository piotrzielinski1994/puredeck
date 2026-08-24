import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("CardGrid Enter key (TC-001..TC-008)", () => {
  it("should create a card if Enter is pressed in the front input when both fields are filled", async () => {
    const user = userEvent.setup();
    const { onAddCard } = renderGrid();

    await user.type(screen.getByLabelText("New card front"), "Q1");
    await user.type(screen.getByLabelText("New card back"), "A1");
    await user.keyboard("{Enter}");

    expect(onAddCard).toHaveBeenCalledTimes(1);
    expect(onAddCard).toHaveBeenCalledWith("Q1", "A1");
  });

  it("should create a card if Enter is pressed in the back input when both fields are filled", async () => {
    const user = userEvent.setup();
    const { onAddCard } = renderGrid();

    await user.type(screen.getByLabelText("New card front"), "Q2");
    await user.type(screen.getByLabelText("New card back"), "A2");
    await user.click(screen.getByLabelText("New card back"));
    await user.keyboard("{Enter}");

    expect(onAddCard).toHaveBeenCalledTimes(1);
    expect(onAddCard).toHaveBeenCalledWith("Q2", "A2");
  });

  it("should not create a card if Enter is pressed in the front input and only front is filled", async () => {
    const user = userEvent.setup();
    const { onAddCard } = renderGrid();

    await user.type(screen.getByLabelText("New card front"), "Q3");
    await user.keyboard("{Enter}");

    expect(onAddCard).not.toHaveBeenCalled();
  });

  it("should not create a card if Enter is pressed in the back input and only back is filled", async () => {
    const user = userEvent.setup();
    const { onAddCard } = renderGrid();

    await user.type(screen.getByLabelText("New card back"), "A4");
    await user.click(screen.getByLabelText("New card back"));
    await user.keyboard("{Enter}");

    expect(onAddCard).not.toHaveBeenCalled();
  });

  it("should not create a card if Enter is pressed in the front input and both fields are empty", async () => {
    const user = userEvent.setup();
    const { onAddCard } = renderGrid();

    await user.click(screen.getByLabelText("New card front"));
    await user.keyboard("{Enter}");

    expect(onAddCard).not.toHaveBeenCalled();
  });

  it("should create a card with trimmed values if Enter is pressed and fields contain whitespace", async () => {
    const user = userEvent.setup();
    const { onAddCard } = renderGrid();

    await user.type(screen.getByLabelText("New card front"), " Q ");
    await user.type(screen.getByLabelText("New card back"), " A ");
    await user.keyboard("{Enter}");

    expect(onAddCard).toHaveBeenCalledTimes(1);
    expect(onAddCard).toHaveBeenCalledWith("Q", "A");
  });

  it("should clear add-row inputs after Enter creates a card", async () => {
    const user = userEvent.setup();
    const { onAddCard } = renderGrid();

    await user.type(screen.getByLabelText("New card front"), "Q1");
    await user.type(screen.getByLabelText("New card back"), "A1");
    await user.keyboard("{Enter}");

    expect(onAddCard).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByLabelText("New card front") as HTMLInputElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText("New card back") as HTMLInputElement).value,
    ).toBe("");
  });

  it("should not double-commit if Enter creates a card and then the back input is blurred", async () => {
    const user = userEvent.setup();
    const { onAddCard } = renderGrid();

    await user.type(screen.getByLabelText("New card front"), "Q4");
    await user.type(screen.getByLabelText("New card back"), "A4");
    await user.keyboard("{Enter}");

    expect(onAddCard).toHaveBeenCalledTimes(1);
    expect(onAddCard).toHaveBeenCalledWith("Q4", "A4");

    await user.click(screen.getByLabelText("New card back"));
    await user.keyboard("{Tab}");

    expect(onAddCard).toHaveBeenCalledTimes(1);
  });
});

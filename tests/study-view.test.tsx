import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StudyView } from "@/components/workspace/study-view";
import type { Deck } from "@/lib/workspace/model";

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

describe("StudyView (AC-006 / TC-006)", () => {
  it("should show the front of the first card and hide the grade buttons before flipping", () => {
    render(<StudyView deck={deck} />);

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
    render(<StudyView deck={deck} />);

    fireEvent.click(screen.getByText("gato"));

    expect(screen.getByText("cat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /good/i })).toBeInTheDocument();
  });

  it("should reveal the back when Space is pressed", () => {
    render(<StudyView deck={deck} />);

    expect(
      screen.queryByRole("button", { name: /good/i }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: " ", code: "Space" });

    expect(screen.getByText("cat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /good/i })).toBeInTheDocument();
  });

  it("should advance to the next card and re-hide the back when a grade is clicked", () => {
    render(<StudyView deck={deck} />);

    fireEvent.click(screen.getByText("gato"));
    fireEvent.click(screen.getByRole("button", { name: /good/i }));

    expect(screen.getByText("hola")).toBeInTheDocument();
    expect(screen.queryByText("gato")).not.toBeInTheDocument();
    expect(screen.getByText(/card\s*2\s*\/\s*2/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /good/i }),
    ).not.toBeInTheDocument();
  });

  it("should show a progress label of Card 1 / N", () => {
    render(<StudyView deck={deck} />);

    expect(screen.getByText(/card\s*1\s*\/\s*2/i)).toBeInTheDocument();
  });
});

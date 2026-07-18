import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@/components/workspace/workspace-context";
import { createInMemoryCollectionStore } from "@/lib/workspace/in-memory-collection";
import { serializeDeck } from "@/lib/workspace/collection";
import { createInMemoryReviewStore } from "@/lib/study/in-memory-review-store";
import type { Deck } from "@/lib/workspace/model";

const deck: Deck = {
  id: "a",
  name: "Alpha",
  cards: [{ id: "a1", front: "uno", back: "one" }],
};

function GradeHarness() {
  const { reviews, gradeCard } = useWorkspace();
  const review = reviews["a1"];
  return (
    <div>
      <div data-testid="review">
        {review
          ? `reps=${review.reps} interval=${review.intervalDays}`
          : "no-review"}
      </div>
      <button type="button" onClick={() => gradeCard("a1", "Good")}>
        grade
      </button>
    </div>
  );
}

afterEach(() => {
  cleanup();
});

describe("WorkspaceProvider gradeCard (AC-004 / TC-013)", () => {
  it("should persist the scheduled review to the reviewStore and expose it via context when a card is graded Good", async () => {
    const user = userEvent.setup();
    const store = createInMemoryCollectionStore({ alpha: serializeDeck(deck) });
    const reviewStore = createInMemoryReviewStore();
    const save = vi.spyOn(reviewStore, "save");

    render(
      <SettingsProvider store={createInMemorySettingsStore()}>
        <WorkspaceProvider store={store} reviewStore={reviewStore}>
          <GradeHarness />
        </WorkspaceProvider>
      </SettingsProvider>,
    );

    expect(await screen.findByTestId("review")).toHaveTextContent("no-review");

    await user.click(screen.getByRole("button", { name: /grade/i }));

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        a1: expect.objectContaining({ reps: 1, intervalDays: 1 }),
      }),
    );
    expect(screen.getByTestId("review")).toHaveTextContent("reps=1 interval=1");
  });
});

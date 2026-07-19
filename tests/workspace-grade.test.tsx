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
import { createInMemoryRevlogStore } from "@/lib/study/in-memory-revlog-store";
import { Rating } from "@/lib/study/fsrs";
import type { Deck } from "@/lib/workspace/model";

const deck: Deck = {
  id: "a",
  name: "Alpha",
  cards: [{ id: "a1", front: "uno", back: "one" }],
};

function GradeHarness() {
  const { reviews, gradeCard } = useWorkspace();
  return (
    <div>
      <div data-testid="review">{`reps=${reviews.a1?.reps ?? "none"}`}</div>
      <button type="button" onClick={() => gradeCard("a1", Rating.Good)}>
        grade
      </button>
    </div>
  );
}

afterEach(() => {
  cleanup();
});

describe("WorkspaceProvider gradeCard FSRS (AC-004 / AC-005 / TC-013)", () => {
  it("should schedule the card via FSRS, persist the review map and revlog, and expose the graded review when a card is graded Good", async () => {
    const user = userEvent.setup();
    const store = createInMemoryCollectionStore({ alpha: serializeDeck(deck) });
    const reviewStore = createInMemoryReviewStore();
    const revlogStore = createInMemoryRevlogStore();
    const saveReviews = vi.spyOn(reviewStore, "save");
    const saveRevlog = vi.spyOn(revlogStore, "save");

    render(
      <SettingsProvider store={createInMemorySettingsStore()}>
        <WorkspaceProvider
          store={store}
          reviewStore={reviewStore}
          revlogStore={revlogStore}
        >
          <GradeHarness />
        </WorkspaceProvider>
      </SettingsProvider>,
    );

    expect(await screen.findByTestId("review")).toHaveTextContent("reps=none");

    await user.click(screen.getByRole("button", { name: /grade/i }));

    expect(saveReviews).toHaveBeenCalledWith(
      expect.objectContaining({
        a1: expect.objectContaining({ reps: 1 }),
      }),
    );
    const savedReviews = saveReviews.mock.calls.at(-1)?.[0];
    expect(savedReviews?.a1.due).toBeInstanceOf(Date);

    const savedRevlog = saveRevlog.mock.calls.at(-1)?.[0];
    expect(savedRevlog?.at(-1)?.cid).toBe("a1");
    expect(savedRevlog?.at(-1)?.rating).toBe(Rating.Good);

    expect(screen.getByTestId("review")).toHaveTextContent("reps=1");
  });

  it("should append to the revlog on each grade rather than overwrite it", async () => {
    const user = userEvent.setup();
    const store = createInMemoryCollectionStore({ alpha: serializeDeck(deck) });
    const reviewStore = createInMemoryReviewStore();
    const revlogStore = createInMemoryRevlogStore();
    const saveRevlog = vi.spyOn(revlogStore, "save");

    render(
      <SettingsProvider store={createInMemorySettingsStore()}>
        <WorkspaceProvider
          store={store}
          reviewStore={reviewStore}
          revlogStore={revlogStore}
        >
          <GradeHarness />
        </WorkspaceProvider>
      </SettingsProvider>,
    );

    expect(await screen.findByTestId("review")).toHaveTextContent("reps=none");

    const gradeButton = screen.getByRole("button", { name: /grade/i });
    await user.click(gradeButton);
    await user.click(gradeButton);

    expect(saveRevlog.mock.calls[0][0]).toHaveLength(1);
    expect(saveRevlog.mock.calls[1][0]).toHaveLength(2);
  });
});

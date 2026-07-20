import { describe, expect, it } from "vitest";
import {
  SETTINGS_TAB_ID,
  pruneTabsToDecks,
  studyTabId,
} from "@/lib/workspace/model";

describe("pruneTabsToDecks (AC-007 / E-6)", () => {
  it("should keep the Settings tab even if no decks exist", () => {
    expect(pruneTabsToDecks([SETTINGS_TAB_ID], new Set())).toEqual([
      SETTINGS_TAB_ID,
    ]);
  });

  it("should keep a deck tab whose id is a present deck", () => {
    expect(pruneTabsToDecks(["spanish"], new Set(["spanish"]))).toEqual([
      "spanish",
    ]);
  });

  it("should drop a deck tab whose deck is absent", () => {
    expect(pruneTabsToDecks(["spanish"], new Set(["french"]))).toEqual([]);
  });

  it("should keep a study tab whose resolved deck is present and drop one that is absent", () => {
    const kept = studyTabId("spanish");
    const gone = studyTabId("verbs");

    expect(
      pruneTabsToDecks([kept, gone], new Set(["spanish"])),
    ).toEqual([kept]);
  });

  it("should preserve the original order of the kept tabs", () => {
    const study = studyTabId("capitals");
    const openTabIds = ["spanish", SETTINGS_TAB_ID, "verbs", study];
    const deckIds = new Set(["spanish", "capitals", "verbs"]);

    expect(pruneTabsToDecks(openTabIds, deckIds)).toEqual([
      "spanish",
      SETTINGS_TAB_ID,
      "verbs",
      study,
    ]);
  });

  it("should drop only the tabs whose decks vanished, keeping Settings and valid tabs", () => {
    const study = studyTabId("gone");
    const openTabIds = ["spanish", "gone", SETTINGS_TAB_ID, study];
    const deckIds = new Set(["spanish"]);

    expect(pruneTabsToDecks(openTabIds, deckIds)).toEqual([
      "spanish",
      SETTINGS_TAB_ID,
    ]);
  });
});

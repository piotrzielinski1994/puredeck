export type Card = {
  id: string;
  front: string;
  back: string;
};

export type Deck = {
  id: string;
  name: string;
  cards: Card[];
};

export const SETTINGS_TAB_ID = "__settings__";

export function studyTabId(deckId: string): string {
  return `__study__:${deckId}`;
}

export function isStudyTabId(tabId: string): boolean {
  return tabId.startsWith("__study__:");
}

export function studyDeckId(tabId: string): string {
  return tabId.slice("__study__:".length);
}

export function pruneTabsToDecks(
  openTabIds: string[],
  deckIds: Set<string>,
): string[] {
  return openTabIds.filter((tabId) => {
    if (tabId === SETTINGS_TAB_ID) {
      return true;
    }
    const deckId = isStudyTabId(tabId) ? studyDeckId(tabId) : tabId;
    return deckIds.has(deckId);
  });
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSettings } from "@/lib/settings/settings-context";
import {
  SETTINGS_TAB_ID,
  isStudyTabId,
  pruneTabsToDecks,
  studyDeckId,
  studyTabId,
  type Deck,
} from "@/lib/workspace/model";
import type { CollectionStore } from "@/lib/workspace/collection";
import { createCollectionStore } from "@/lib/workspace/collection-store-factory";
import {
  newDeck,
  uniqueDeckName,
  withDeckRemoved,
  withDeckUpserted,
} from "@/lib/workspace/deck-ops";
import { useToast } from "@/components/ui/toast";
import type { ReviewStore } from "@/lib/study/review-store";
import { createReviewStore } from "@/lib/study/review-store-factory";
import type { Revlog, RevlogStore } from "@/lib/study/revlog-store";
import { createRevlogStore } from "@/lib/study/revlog-store-factory";
import {
  createScheduler,
  gradeReview,
  newCard,
  type Card as FsrsCard,
  type Grade,
  type ReviewMap,
} from "@/lib/study/fsrs";
import { nowDate } from "@/lib/study/queue";

export type TabKind = "deck" | "study" | "settings";

export type Tab = {
  id: string;
  kind: TabKind;
  label: string;
  deckId: string | null;
};

type WorkspaceContextValue = {
  decks: Deck[];
  selectedDeckId: string | null;
  openTabIds: string[];
  activeTabId: string | null;
  tabs: Tab[];
  deckById: (id: string) => Deck | undefined;
  saveDeck: (deck: Deck) => void;
  createDeck: () => string;
  renameDeck: (id: string, name: string) => void;
  deleteDeck: (id: string) => void;
  renamingDeckId: string | null;
  beginRename: (id: string) => void;
  cancelRename: () => void;
  pendingDeleteDeckId: string | null;
  requestDeleteDeck: (id: string) => void;
  confirmDeleteDeck: () => void;
  cancelDeleteDeck: () => void;
  reviews: ReviewMap;
  gradeCard: (cardId: string, grade: Grade) => FsrsCard;
  openDeck: (id: string) => void;
  openStudy: (deckId: string) => void;
  openSettings: () => void;
  setActiveTab: (id: string) => void;
  closeTab: (id: string) => void;
  reorderTabs: (ids: string[]) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function neighbourAfterClose(
  openTabIds: string[],
  closedId: string,
): string | null {
  const index = openTabIds.indexOf(closedId);
  const remaining = openTabIds.filter((id) => id !== closedId);
  if (remaining.length === 0) {
    return null;
  }
  return remaining[Math.min(index, remaining.length - 1)];
}

export function WorkspaceProvider({
  children,
  decks: decksProp,
  store,
  reviewStore,
  revlogStore,
}: {
  children: ReactNode;
  decks?: Deck[];
  store?: CollectionStore;
  reviewStore?: ReviewStore;
  revlogStore?: RevlogStore;
}) {
  const { settings, saveOpenTabs } = useSettings();
  const { show } = useToast();
  const collectionStore = useMemo(
    () => store ?? createCollectionStore(settings.collectionPath),
    [store, settings.collectionPath],
  );
  const tabStateRef = useRef<{
    openTabIds: string[];
    activeTabId: string | null;
    saveOpenTabs: (openTabIds: string[], activeTabId: string | null) => void;
  }>({ openTabIds: [], activeTabId: null, saveOpenTabs });
  const [reviewStoreInstance] = useState(
    () => reviewStore ?? createReviewStore(),
  );
  const [revlogStoreInstance] = useState(
    () => revlogStore ?? createRevlogStore(),
  );
  const [scheduler] = useState(createScheduler);
  const [loadedDecks, setLoadedDecks] = useState<Deck[]>(decksProp ?? []);
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [revlog, setRevlog] = useState<Revlog>([]);
  const [renamingDeckId, setRenamingDeckId] = useState<string | null>(null);
  const [pendingDeleteDeckId, setPendingDeleteDeckId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (decksProp) {
      return;
    }
    let isMounted = true;
    collectionStore.load().then((loaded) => {
      if (!isMounted) {
        return;
      }
      setLoadedDecks(loaded);
      const deckIds = new Set(loaded.map((deck) => deck.id));
      const current = tabStateRef.current;
      const pruned = pruneTabsToDecks(current.openTabIds, deckIds);
      if (pruned.length === current.openTabIds.length) {
        return;
      }
      const nextActive =
        current.activeTabId !== null && pruned.includes(current.activeTabId)
          ? current.activeTabId
          : (pruned[0] ?? null);
      current.saveOpenTabs(pruned, nextActive);
    });
    return () => {
      isMounted = false;
    };
  }, [collectionStore, decksProp]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([reviewStoreInstance.load(), revlogStoreInstance.load()]).then(
      ([loadedReviews, loadedRevlog]) => {
        if (isMounted) {
          setReviews(loadedReviews);
          setRevlog(loadedRevlog);
        }
      },
    );
    return () => {
      isMounted = false;
    };
  }, [reviewStoreInstance, revlogStoreInstance]);

  const decks = loadedDecks;

  const gradeCard = useCallback(
    (cardId: string, grade: Grade) => {
      const now = nowDate();
      const current = reviews[cardId] ?? newCard(now);
      const { card, log } = gradeReview(scheduler, current, grade, cardId, now);
      const nextReviews = { ...reviews, [cardId]: card };
      const nextRevlog = [...revlog, { cid: cardId, ...log }];
      setReviews(nextReviews);
      setRevlog(nextRevlog);
      reviewStoreInstance.save(nextReviews);
      revlogStoreInstance.save(nextRevlog);
      return card;
    },
    [reviews, revlog, scheduler, reviewStoreInstance, revlogStoreInstance],
  );

  const saveDeck = useCallback(
    (deck: Deck) => {
      setLoadedDecks((current) =>
        current.map((existing) => (existing.id === deck.id ? deck : existing)),
      );
      collectionStore.save(deck);
      show("Saved");
    },
    [collectionStore, show],
  );

  const { openTabIds } = settings;
  const activeTabId =
    settings.activeTabId !== null && openTabIds.includes(settings.activeTabId)
      ? settings.activeTabId
      : (openTabIds[0] ?? null);

  useEffect(() => {
    tabStateRef.current = { openTabIds, activeTabId, saveOpenTabs };
  }, [openTabIds, activeTabId, saveOpenTabs]);

  const deckById = useCallback(
    (id: string) => decks.find((deck) => deck.id === id),
    [decks],
  );

  const tabLabel = useCallback(
    (
      tabId: string,
    ): { kind: TabKind; label: string; deckId: string | null } => {
      if (tabId === SETTINGS_TAB_ID) {
        return { kind: "settings", label: "Settings", deckId: null };
      }
      if (isStudyTabId(tabId)) {
        const deckId = studyDeckId(tabId);
        return {
          kind: "study",
          label: `Study: ${deckById(deckId)?.name ?? "deck"}`,
          deckId,
        };
      }
      return {
        kind: "deck",
        label: deckById(tabId)?.name ?? tabId,
        deckId: tabId,
      };
    },
    [deckById],
  );

  const tabs = useMemo<Tab[]>(
    () => openTabIds.map((id) => ({ id, ...tabLabel(id) })),
    [openTabIds, tabLabel],
  );

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const selectedDeckId = activeTab?.deckId ?? null;

  const openTab = useCallback(
    (id: string) => {
      const nextOpen = openTabIds.includes(id)
        ? openTabIds
        : [...openTabIds, id];
      saveOpenTabs(nextOpen, id);
    },
    [openTabIds, saveOpenTabs],
  );

  const openDeck = useCallback((id: string) => openTab(id), [openTab]);
  const openStudy = useCallback(
    (deckId: string) => openTab(studyTabId(deckId)),
    [openTab],
  );
  const openSettings = useCallback(() => openTab(SETTINGS_TAB_ID), [openTab]);

  const setActiveTab = useCallback(
    (id: string) => saveOpenTabs(openTabIds, id),
    [openTabIds, saveOpenTabs],
  );

  const closeTab = useCallback(
    (id: string) => {
      const nextOpen = openTabIds.filter((tabId) => tabId !== id);
      const nextActive =
        activeTabId === id ? neighbourAfterClose(openTabIds, id) : activeTabId;
      saveOpenTabs(nextOpen, nextActive);
    },
    [openTabIds, activeTabId, saveOpenTabs],
  );

  const reorderTabs = useCallback(
    (ids: string[]) => saveOpenTabs(ids, activeTabId),
    [activeTabId, saveOpenTabs],
  );

  const createDeck = useCallback((): string => {
    const takenNames = new Set(decks.map((deck) => deck.name));
    const created = newDeck(uniqueDeckName("New Deck", takenNames));
    setLoadedDecks((current) => withDeckUpserted(current, created));
    collectionStore.save(created);
    openTab(created.id);
    setRenamingDeckId(created.id);
    return created.id;
  }, [decks, collectionStore, openTab]);

  const beginRename = useCallback((id: string) => setRenamingDeckId(id), []);
  const cancelRename = useCallback(() => setRenamingDeckId(null), []);

  const renameDeck = useCallback(
    (id: string, name: string) => {
      setRenamingDeckId(null);
      const trimmed = name.trim();
      const target = decks.find((deck) => deck.id === id);
      if (trimmed === "" || !target || trimmed === target.name) {
        return;
      }
      const renamed = { ...target, name: trimmed };
      setLoadedDecks((current) => withDeckUpserted(current, renamed));
      collectionStore.save(renamed);
    },
    [decks, collectionStore],
  );

  const deleteDeck = useCallback(
    (id: string) => {
      setLoadedDecks((current) => withDeckRemoved(current, id));
      collectionStore.remove(id);
      const survivingIds = new Set(
        decks.filter((deck) => deck.id !== id).map((deck) => deck.id),
      );
      const pruned = pruneTabsToDecks(openTabIds, survivingIds);
      const nextActive =
        activeTabId !== null && pruned.includes(activeTabId)
          ? activeTabId
          : (pruned[0] ?? null);
      saveOpenTabs(pruned, nextActive);
    },
    [decks, collectionStore, openTabIds, activeTabId, saveOpenTabs],
  );

  const requestDeleteDeck = useCallback(
    (id: string) => setPendingDeleteDeckId(id),
    [],
  );
  const cancelDeleteDeck = useCallback(
    () => setPendingDeleteDeckId(null),
    [],
  );
  const confirmDeleteDeck = useCallback(() => {
    if (pendingDeleteDeckId !== null) {
      deleteDeck(pendingDeleteDeckId);
    }
    setPendingDeleteDeckId(null);
  }, [pendingDeleteDeckId, deleteDeck]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      decks,
      selectedDeckId,
      openTabIds,
      activeTabId,
      tabs,
      deckById,
      saveDeck,
      createDeck,
      renameDeck,
      deleteDeck,
      renamingDeckId,
      beginRename,
      cancelRename,
      pendingDeleteDeckId,
      requestDeleteDeck,
      confirmDeleteDeck,
      cancelDeleteDeck,
      reviews,
      gradeCard,
      openDeck,
      openStudy,
      openSettings,
      setActiveTab,
      closeTab,
      reorderTabs,
    }),
    [
      decks,
      selectedDeckId,
      openTabIds,
      activeTabId,
      tabs,
      deckById,
      saveDeck,
      createDeck,
      renameDeck,
      deleteDeck,
      renamingDeckId,
      beginRename,
      cancelRename,
      pendingDeleteDeckId,
      requestDeleteDeck,
      confirmDeleteDeck,
      cancelDeleteDeck,
      reviews,
      gradeCard,
      openDeck,
      openStudy,
      openSettings,
      setActiveTab,
      closeTab,
      reorderTabs,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return value;
}

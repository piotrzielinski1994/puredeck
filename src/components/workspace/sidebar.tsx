import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  cn,
} from "@pziel/pureui";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useWorkspace } from "@/components/workspace/workspace-context";
import {
  exportCollection,
  importCollection,
} from "@/lib/deck/import-export/collection-transfer";
import type { Deck } from "@/lib/workspace/model";

function RenameInput({
  name,
  onCommit,
  onCancel,
}: {
  name: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);
  const readyRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    const settle = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
      readyRef.current = true;
    }, 0);
    return () => clearTimeout(settle);
  }, []);

  const finish = (commit: boolean): void => {
    if (doneRef.current) {
      return;
    }
    doneRef.current = true;
    if (commit) {
      onCommit(value);
      return;
    }
    onCancel();
  };

  return (
    <input
      ref={inputRef}
      aria-label="Rename deck"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          finish(true);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          finish(false);
        }
      }}
      onBlur={() => {
        if (!readyRef.current) {
          const el = inputRef.current;
          setTimeout(() => {
            el?.focus();
            el?.select();
          }, 0);
          return;
        }
        finish(true);
      }}
      className="min-h-11 w-full border bg-background px-2.5 text-[13px] outline-none focus:border-primary md:min-h-0 md:py-1"
    />
  );
}

function DeckRow({
  deck,
  isSelected,
  isRenaming,
  onOpen,
  onBeginRename,
  onCommitRename,
  onCancelRename,
  onRequestDelete,
}: {
  deck: Deck;
  isSelected: boolean;
  isRenaming: boolean;
  onOpen: () => void;
  onBeginRename: () => void;
  onCommitRename: (value: string) => void;
  onCancelRename: () => void;
  onRequestDelete: () => void;
}) {
  if (isRenaming) {
    return (
      <div className="px-3 py-1">
        <RenameInput
          name={deck.name}
          onCommit={onCommitRename}
          onCancel={onCancelRename}
        />
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          aria-current={isSelected}
          onClick={onOpen}
          className={cn(
            "flex min-h-11 items-center px-3 py-1 text-left text-[13px] whitespace-nowrap hover:bg-accent md:min-h-0",
            isSelected && "bg-accent",
          )}
        >
          {deck.name}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent onCloseAutoFocus={(event) => event.preventDefault()}>
        <ContextMenuItem onSelect={onBeginRename}>Rename</ContextMenuItem>
        <ContextMenuItem variant="destructive" onSelect={onRequestDelete}>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function TransferFooterButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 w-full px-3 py-2 text-left text-[13px] whitespace-nowrap hover:bg-accent md:min-h-0 md:py-1.5"
    >
      {label}
    </button>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const {
    decks,
    selectedDeckId,
    openDeck,
    createDeck,
    importDecks,
    renamingDeckId,
    beginRename,
    renameDeck,
    cancelRename,
    requestDeleteDeck,
  } = useWorkspace();
  const { show } = useToast();

  const handleOpen = (deckId: string): void => {
    openDeck(deckId);
    onNavigate?.();
  };

  const handleExport = async (): Promise<void> => {
    const result = await exportCollection(decks);
    if (result.kind === "done") {
      show(`Exported ${result.count} decks.`);
      return;
    }
    if (result.kind === "error") {
      show(result.message);
    }
  };

  const handleImport = async (): Promise<void> => {
    const result = await importCollection();
    if (result.kind === "cancelled") {
      return;
    }
    if (result.kind === "error") {
      show(result.message);
      return;
    }
    importDecks(result.decks);
  };

  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div className="flex h-9 shrink-0 items-center border-b pl-3 text-sm font-semibold">
        puredeck
      </div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <nav
            aria-label="Decks"
            className="flex min-h-0 flex-1 flex-col overflow-y-auto py-1"
          >
            {decks.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                No decks yet. Right-click here to create one.
              </p>
            ) : (
              decks.map((deck) => (
                <DeckRow
                  key={deck.id}
                  deck={deck}
                  isSelected={deck.id === selectedDeckId}
                  isRenaming={deck.id === renamingDeckId}
                  onOpen={() => handleOpen(deck.id)}
                  onBeginRename={() => beginRename(deck.id)}
                  onCommitRename={(value) => renameDeck(deck.id, value)}
                  onCancelRename={cancelRename}
                  onRequestDelete={() => requestDeleteDeck(deck.id)}
                />
              ))
            )}
          </nav>
        </ContextMenuTrigger>
        <ContextMenuContent
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <ContextMenuItem onSelect={() => createDeck()}>
            New deck
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <div className="flex shrink-0 flex-col border-t py-1">
        <TransferFooterButton label="+ New deck" onClick={() => createDeck()} />
        <TransferFooterButton
          label="Export collection..."
          onClick={() => void handleExport()}
        />
        <TransferFooterButton
          label="Import collection..."
          onClick={() => void handleImport()}
        />
      </div>
    </div>
  );
}

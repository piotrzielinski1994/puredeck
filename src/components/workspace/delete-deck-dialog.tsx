import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/components/workspace/workspace-context";

export function DeleteDeckDialog() {
  const { pendingDeleteDeckId, deckById, confirmDeleteDeck, cancelDeleteDeck } =
    useWorkspace();

  const deck =
    pendingDeleteDeckId !== null ? deckById(pendingDeleteDeckId) : undefined;

  return (
    <Dialog
      open={pendingDeleteDeckId !== null}
      onOpenChange={(next) => {
        if (!next) {
          cancelDeleteDeck();
        }
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete &quot;{deck?.name ?? "deck"}&quot;?</DialogTitle>
          <DialogDescription>
            Removes the deck and all its cards. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={cancelDeleteDeck}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirmDeleteDeck}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

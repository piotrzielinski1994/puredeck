import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, Search } from "lucide-react";
import { Main } from "@/components/workspace/main";
import { Sidebar } from "@/components/workspace/sidebar";
import { usePalette } from "@/lib/palette/palette-context";

export function MobileShell() {
  const { setOpen: setPaletteOpen } = usePalette();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-11 shrink-0 items-stretch border-b bg-muted/30">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setIsDrawerOpen(true)}
          className="flex min-h-11 w-11 items-center justify-center border-r text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Menu className="size-4" />
        </button>
        <div className="flex flex-1 items-center pl-3 text-sm font-semibold">
          puredeck
        </div>
        <button
          type="button"
          aria-label="Open command palette"
          onClick={() => setPaletteOpen(true)}
          className="flex min-h-11 w-11 items-center justify-center border-l text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Search className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <Main />
      </div>
      <DialogPrimitive.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85%] flex-col bg-background shadow-lg outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left">
            <DialogPrimitive.Title className="sr-only">
              Decks
            </DialogPrimitive.Title>
            <Sidebar onNavigate={() => setIsDrawerOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

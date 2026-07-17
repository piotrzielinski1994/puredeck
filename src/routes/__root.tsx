import { useState } from "react";
import {
  createRootRoute,
  Link,
  Outlet,
  useRouter,
} from "@tanstack/react-router";
import { useHotkey } from "@tanstack/react-hotkeys";
import { CommandPalette } from "@/components/command-palette";

function RootLayout() {
  const router = useRouter();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  useHotkey("Mod+K", (event) => {
    event.preventDefault();
    setIsPaletteOpen((open) => !open);
  });

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="flex items-center gap-1 border-b px-4 py-2">
        <span className="mr-4 font-semibold">PureDeck</span>
        <Link
          to="/"
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground [&.active]:text-foreground"
        >
          Home
        </Link>
        <Link
          to="/settings"
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground [&.active]:text-foreground"
        >
          Settings
        </Link>
      </nav>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
      <CommandPalette
        open={isPaletteOpen}
        onOpenChange={setIsPaletteOpen}
        commands={[
          {
            id: "go-home",
            name: "Go to Home",
            run: () => router.navigate({ to: "/" }),
          },
          {
            id: "go-settings",
            name: "Go to Settings",
            run: () => router.navigate({ to: "/settings" }),
          },
        ]}
      />
    </div>
  );
}

function NotFound() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        The route you requested does not exist.
      </p>
      <Link to="/" className="mt-4 inline-block underline">
        Back to Home
      </Link>
    </div>
  );
}

export const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

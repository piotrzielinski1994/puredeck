import { createRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { greet } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { DemoTable, type DemoCardRow } from "@/components/demo-table";
import { DemoForm } from "@/components/demo-form";
import { rootRoute } from "@/routes/__root";

const DEMO_ROWS: DemoCardRow[] = [
  { id: "1", deck: "Spanish", front: "hola", back: "hello" },
  { id: "2", deck: "Spanish", front: "gato", back: "cat" },
  { id: "3", deck: "Capitals", front: "France", back: "Paris" },
];

function Greeting() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["greet", "PureDeck"],
    queryFn: () => greet("PureDeck"),
  });

  if (isPending) {
    return <p className="text-muted-foreground">Loading...</p>;
  }
  if (isError) {
    return (
      <p role="alert" className="text-destructive">
        Failed to reach the backend.
      </p>
    );
  }
  return <p data-testid="greeting">{data}</p>;
}

function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Welcome to PureDeck</h1>
        <Greeting />
        <div>
          <Button>Get started</Button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Cards</h2>
        <DemoTable rows={DEMO_ROWS} />
      </section>

      <section className="flex max-w-sm flex-col gap-2">
        <h2 className="text-lg font-medium">Add a card</h2>
        <DemoForm />
      </section>
    </div>
  );
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

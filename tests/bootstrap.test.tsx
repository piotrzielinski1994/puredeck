import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { AppProviders } from "@/app/providers";
import { rootRoute } from "@/routes/__root";
import { indexRoute } from "@/routes/index";
import { settingsRoute } from "@/routes/settings";
import { DemoTable, type DemoCardRow } from "@/components/demo-table";
import { DemoForm } from "@/components/demo-form";
import { CommandPalette } from "@/components/command-palette";

const GREET_TEXT = "Hello, PureDeck! Welcome to PureDeck.";

const routeTree = rootRoute.addChildren([indexRoute, settingsRoute]);

function renderApp(initialEntries: string[] = ["/"]) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries }),
  });

  const utils = render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );

  return { router, ...utils };
}

beforeEach(() => {
  vi.mocked(invoke).mockReset();
  vi.mocked(invoke).mockResolvedValue(GREET_TEXT);
});

afterEach(() => {
  cleanup();
});

describe("home route (TC-001 / AC-002 / AC-008)", () => {
  it("should render the welcome heading and the Get started button", async () => {
    renderApp(["/"]);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Welcome to PureDeck",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Get started" }),
    ).toBeInTheDocument();
  });
});

describe("navigation (TC-002 / AC-003)", () => {
  it("should navigate to /settings and back to home via nav links", async () => {
    const user = userEvent.setup();
    renderApp(["/"]);

    await screen.findByRole("heading", {
      level: 1,
      name: "Welcome to PureDeck",
    });

    await user.click(screen.getByRole("link", { name: "Settings" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Settings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Configuration for PureDeck will live here."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Home" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Welcome to PureDeck",
      }),
    ).toBeInTheDocument();
  });

  it("should render the settings route when history starts at /settings", async () => {
    renderApp(["/settings"]);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("should render the not-found route for an unknown path", async () => {
    renderApp(["/does-not-exist"]);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
  });
});

describe("greet IPC query (TC-003 / AC-004 / AC-011)", () => {
  it("should render the greeting text returned by the mocked greet command", async () => {
    renderApp(["/"]);

    const greeting = await screen.findByTestId("greeting");
    expect(greeting).toHaveTextContent(GREET_TEXT);
    expect(vi.mocked(invoke)).toHaveBeenCalledWith("greet", {
      name: "PureDeck",
    });
  });

  it("should show the Loading placeholder before the greet query resolves", async () => {
    let resolveGreet!: (value: string) => void;
    vi.mocked(invoke).mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveGreet = resolve;
      }),
    );

    renderApp(["/"]);

    expect(await screen.findByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByTestId("greeting")).not.toBeInTheDocument();

    resolveGreet(GREET_TEXT);

    expect(await screen.findByTestId("greeting")).toHaveTextContent(GREET_TEXT);
  });

  it("should render an error alert and keep the app alive if greet rejects", async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error("ipc down"));

    renderApp(["/"]);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Failed to reach the backend.");
    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to PureDeck" }),
    ).toBeInTheDocument();
  });
});

describe("command palette (TC-004 / AC-007)", () => {
  it("should open the command palette when Mod+K is pressed", async () => {
    renderApp(["/"]);

    await screen.findByRole("heading", {
      level: 1,
      name: "Welcome to PureDeck",
    });

    fireEvent.keyDown(document, { key: "k", code: "KeyK", ctrlKey: true });

    expect(await screen.findByText("Go to Home")).toBeInTheDocument();
    expect(screen.getByText("Go to Settings")).toBeInTheDocument();
  });

  it("should run a command and close when a palette item is selected", async () => {
    const user = userEvent.setup();
    const run = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <CommandPalette
        open={true}
        onOpenChange={onOpenChange}
        commands={[{ id: "focus-search", name: "Focus search", run }]}
      />,
    );

    await user.click(await screen.findByText("Focus search"));

    expect(run).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("demo table (TC-005 / AC-005)", () => {
  const rows: DemoCardRow[] = [
    { id: "1", deck: "Spanish", front: "hola", back: "hello" },
    { id: "2", deck: "Capitals", front: "France", back: "Paris" },
  ];

  it("should render a row per card with deck/front/back cells", () => {
    render(<DemoTable rows={rows} />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("Spanish")).toBeInTheDocument();
    expect(within(table).getByText("hola")).toBeInTheDocument();
    expect(within(table).getByText("hello")).toBeInTheDocument();
    expect(within(table).getByText("France")).toBeInTheDocument();
    expect(within(table).getByText("Paris")).toBeInTheDocument();
    expect(screen.queryByText("No cards yet.")).not.toBeInTheDocument();
  });

  it("should render an empty-state row when given no rows", () => {
    render(<DemoTable rows={[]} />);

    expect(screen.getByText("No cards yet.")).toBeInTheDocument();
    expect(screen.queryByText("Spanish")).not.toBeInTheDocument();
  });
});

describe("demo form (TC-006 / AC-006)", () => {
  it("should show a validation alert if the form is submitted empty", async () => {
    const user = userEvent.setup();
    render(<DemoForm />);

    await user.click(screen.getByRole("button", { name: "Add card" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Front is required");
    expect(screen.queryByText(/Added card:/)).not.toBeInTheDocument();
  });

  it("should show the added-card confirmation if a value is entered and submitted", async () => {
    const user = userEvent.setup();
    render(<DemoForm />);

    await user.type(screen.getByLabelText("Front"), "capital of France");
    await user.click(screen.getByRole("button", { name: "Add card" }));

    expect(
      await screen.findByText("Added card: capital of France"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

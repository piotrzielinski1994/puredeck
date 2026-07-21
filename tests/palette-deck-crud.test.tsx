import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: () => false,
}));

import { AppProviders } from "@/app/providers";
import { rootRoute } from "@/routes/__root";
import { indexRoute } from "@/routes/index";

function renderApp() {
  const testRouter = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(
    <AppProviders>
      <RouterProvider router={testRouter} />
    </AppProviders>,
  );
}

function openPalette() {
  fireEvent.keyDown(document, { key: "k", code: "KeyK", ctrlKey: true });
}

afterEach(() => {
  cleanup();
});

describe("command palette New deck (AC-010 / TC-008)", () => {
  it("should create and open a deck if the New deck command is run", async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByText("No deck open");
    expect(screen.queryByText("New Deck")).not.toBeInTheDocument();

    openPalette();
    await user.click(await screen.findByText("New deck"));

    expect((await screen.findAllByText("New Deck")).length).toBeGreaterThan(0);
  });
});

describe("command palette Delete deck (AC-010 / TC-008)", () => {
  it("should list a Delete deck command for an existing deck", async () => {
    renderApp();

    await screen.findByText("No deck open");

    openPalette();

    expect(await screen.findByText("Delete deck: Spanish")).toBeInTheDocument();
  });

  it("should open the delete confirm dialog if a Delete deck command is run", async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByText("No deck open");

    openPalette();
    await user.click(await screen.findByText("Delete deck: Spanish"));

    await waitFor(() =>
      expect(screen.getByText('Delete "Spanish"?')).toBeInTheDocument(),
    );
  });
});

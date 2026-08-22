import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/runtime/environment", () => ({
  isDevBrowser: vi.fn(),
}));

import { isDevBrowser } from "@/lib/runtime/environment";
import { rootRoute } from "@/routes/__root";
import { indexRoute } from "@/routes/index";

const mockedIsDevBrowser = vi.mocked(isDevBrowser);

function renderApp() {
  const testRouter = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={testRouter} />);
}

afterEach(() => {
  cleanup();
  mockedIsDevBrowser.mockReset();
});

describe("dev-browser wiring (AC-003 / TC-003)", () => {
  it("should seed the demo decks into the sidebar when isDevBrowser is true", async () => {
    mockedIsDevBrowser.mockReturnValue(true);
    renderApp();

    expect(await screen.findByText("Spanish")).toBeInTheDocument();
    expect(screen.getByText("Capitals")).toBeInTheDocument();
    expect(screen.getByText("Verbs")).toBeInTheDocument();
  });

  it("should not seed the demo decks when isDevBrowser is false", async () => {
    mockedIsDevBrowser.mockReturnValue(false);
    renderApp();

    expect(await screen.findByText("Spanish")).toBeInTheDocument();
    expect(screen.queryByText("Capitals")).not.toBeInTheDocument();
    expect(screen.queryByText("Verbs")).not.toBeInTheDocument();
  });
});

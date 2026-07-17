import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: () => false,
}));

import { AppProviders } from "@/app/providers";
import { router } from "@/router";
import { rootRoute } from "@/routes/__root";
import { indexRoute } from "@/routes/index";

function renderApp(initialEntries: string[] = ["/"]) {
  const testRouter = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries }),
  });
  return render(
    <AppProviders>
      <RouterProvider router={testRouter} />
    </AppProviders>,
  );
}

afterEach(() => {
  cleanup();
});

describe("shell routing (AC-011 / TC-011)", () => {
  it("should serve exactly one route (the shell at /)", () => {
    expect(Object.keys(router.routesByPath)).toEqual(["/"]);
  });

  it("should render the shell empty state at / instead of a settings route", async () => {
    renderApp(["/"]);

    expect(await screen.findByText("No deck open")).toBeInTheDocument();
  });

  it("should open the Settings tab if the palette command is run, without navigating a route", async () => {
    const user = userEvent.setup();
    renderApp(["/"]);

    await screen.findByText("No deck open");

    fireEvent.keyDown(document, { key: "k", code: "KeyK", ctrlKey: true });

    await user.click(await screen.findByText("Open Settings"));

    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: /Settings/ }),
      ).toBeInTheDocument();
    });
    expect(router.routesByPath["/settings" as keyof typeof router.routesByPath]).toBeUndefined();
  });
});

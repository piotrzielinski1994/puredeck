import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "@/components/command-palette";

afterEach(() => {
  cleanup();
});

describe("command palette", () => {
  it("should run a command and close if a palette item is selected", async () => {
    const user = userEvent.setup();
    const run = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <CommandPalette
        open={true}
        onOpenChange={onOpenChange}
        commands={[{ id: "open-settings", name: "Open Settings", run }]}
      />,
    );

    await user.click(await screen.findByText("Open Settings"));

    expect(run).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

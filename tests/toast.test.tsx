import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "@/components/ui/toast";

function Trigger() {
  const { show } = useToast();
  return (
    <button type="button" onClick={() => show("Saved")}>
      go
    </button>
  );
}

afterEach(() => {
  cleanup();
});

describe("ToastProvider (AC-001 / TC-001)", () => {
  it("should display the message if show is called inside a provider", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "go" }));

    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("should not throw if useToast is used without a provider", async () => {
    const user = userEvent.setup();
    render(<Trigger />);

    await expect(
      user.click(screen.getByRole("button", { name: "go" })),
    ).resolves.not.toThrow();
  });
});

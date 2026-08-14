import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  vi.useRealTimers();
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

describe("ToastProvider persistent + action (updater sink contract)", () => {
  function ActionTrigger() {
    const { show } = useToast();
    return (
      <button
        type="button"
        onClick={() =>
          show("Update available: v0.2.0", {
            persistent: true,
            action: { label: "Update now", onClick: () => {} },
          })
        }
      >
        go
      </button>
    );
  }

  it("should render the action label and fire it on click", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    function ActionTrigger2() {
      const { show } = useToast();
      return (
        <button
          type="button"
          onClick={() =>
            show("Update available: v0.2.0", {
              persistent: true,
              action: { label: "Update now", onClick: onAction },
            })
          }
        >
          go
        </button>
      );
    }
    render(
      <ToastProvider>
        <ActionTrigger2 />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "go" }));
    expect(
      screen.getByRole("button", { name: /update now/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /update now/i }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("should keep a persistent toast past the auto-dismiss window", async () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <ActionTrigger />
      </ToastProvider>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "go" }));
    });

    expect(screen.getByText(/update available/i)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText(/update available/i)).toBeInTheDocument();
  });

  it("should auto-dismiss a non-persistent toast", async () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "go" }));
    });

    expect(screen.getByText("Saved")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("should dismiss a persistent toast via the × button", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ActionTrigger />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "go" }));
    await user.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(screen.queryByText(/update available/i)).not.toBeInTheDocument();
  });
});

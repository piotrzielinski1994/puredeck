import { describe, expect, it } from "vitest";
import {
  PANEL_RESIZE_STEP,
  SIDEBAR_MAX_PCT,
  SIDEBAR_MIN_PCT,
  stepSidebarLayout,
} from "@/lib/workspace/panel-resize";

describe("stepSidebarLayout", () => {
  it("should grow the sidebar and shrink main by the inverse if the delta is positive", () => {
    const next = stepSidebarLayout(
      { sidebar: 20, main: 80 },
      PANEL_RESIZE_STEP,
    );

    expect(next).toEqual({ sidebar: 25, main: 75 });
  });

  it("should shrink the sidebar and grow main by the inverse if the delta is negative", () => {
    const next = stepSidebarLayout(
      { sidebar: 20, main: 80 },
      -PANEL_RESIZE_STEP,
    );

    expect(next).toEqual({ sidebar: 15, main: 85 });
  });

  it("should clamp the sidebar at its max and only apply the reachable delta", () => {
    const next = stepSidebarLayout(
      { sidebar: SIDEBAR_MAX_PCT - 2, main: 100 - (SIDEBAR_MAX_PCT - 2) },
      PANEL_RESIZE_STEP,
    );

    expect(next.sidebar).toBe(SIDEBAR_MAX_PCT);
    expect(next.sidebar + next.main).toBe(100);
  });

  it("should clamp the sidebar at its min and only apply the reachable delta", () => {
    const next = stepSidebarLayout(
      { sidebar: SIDEBAR_MIN_PCT + 2, main: 100 - (SIDEBAR_MIN_PCT + 2) },
      -PANEL_RESIZE_STEP,
    );

    expect(next.sidebar).toBe(SIDEBAR_MIN_PCT);
    expect(next.sidebar + next.main).toBe(100);
  });

  it("should be a no-op if the sidebar is already at the clamp bound", () => {
    const layout = { sidebar: SIDEBAR_MAX_PCT, main: 100 - SIDEBAR_MAX_PCT };

    expect(stepSidebarLayout(layout, PANEL_RESIZE_STEP)).toEqual(layout);
  });

  it("should return the layout unchanged if the sidebar or main size is missing", () => {
    expect(stepSidebarLayout({ sidebar: 20 }, PANEL_RESIZE_STEP)).toEqual({
      sidebar: 20,
    });
    expect(stepSidebarLayout({}, PANEL_RESIZE_STEP)).toEqual({});
  });
});

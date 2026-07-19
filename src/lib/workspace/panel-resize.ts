import type { PanelLayout } from "@/lib/settings/settings";

export const PANEL_RESIZE_STEP = 5;
export const SIDEBAR_MIN_PCT = 12;
export const SIDEBAR_MAX_PCT = 40;

const SIDEBAR_ID = "sidebar";
const MAIN_ID = "main";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function stepSidebarLayout(
  layout: PanelLayout,
  deltaPct: number,
): PanelLayout {
  const current = layout[SIDEBAR_ID];
  const sibling = layout[MAIN_ID];
  if (typeof current !== "number" || typeof sibling !== "number") {
    return { ...layout };
  }
  const next = clamp(current + deltaPct, SIDEBAR_MIN_PCT, SIDEBAR_MAX_PCT);
  const applied = next - current;
  if (applied === 0) {
    return { ...layout };
  }
  return { ...layout, [SIDEBAR_ID]: next, [MAIN_ID]: sibling - applied };
}

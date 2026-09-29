// Used by the build-time markup and by the browser count-up, which must end on
// the same string. No DOM.

import type { ProjectMetric } from "../../content/projects";

/** Pinned so Node (the markup) and the browser (the count-up) format alike. */
const NUMBER_LOCALE = "en-US";

export function formatMetricValue(value: number, suffix: ProjectMetric["suffix"]): string {
  if (suffix === "%") return `${value.toFixed(2)}%`;
  const rounded = Math.round(value);
  const formatted = rounded >= 1000 ? rounded.toLocaleString(NUMBER_LOCALE) : String(rounded);
  return formatted + suffix;
}

export function formatLineCount(value: number): string {
  return value.toLocaleString(NUMBER_LOCALE);
}

const STAT_BAR_WIDTH = 22;
const STAT_BAR_CHARACTER = "▊";

export interface StatBars {
  readonly added: string;
  readonly removed: string;
}

/** Always shows at least one added block, so a removal-only commit still reads as a ratio. */
export function buildStatBars(linesAdded: number, linesRemoved: number): StatBars {
  const total = linesAdded + linesRemoved;
  const addedBlocks =
    total === 0 ? 1 : Math.max(1, Math.round((STAT_BAR_WIDTH * linesAdded) / total));
  return {
    added: STAT_BAR_CHARACTER.repeat(addedBlocks),
    removed: STAT_BAR_CHARACTER.repeat(STAT_BAR_WIDTH - addedBlocks),
  };
}

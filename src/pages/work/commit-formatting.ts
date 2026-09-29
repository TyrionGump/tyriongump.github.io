/**
 * Number and stat formatting for the commit rows.
 *
 * Shared between the markup (which bakes the final values into the HTML) and
 * the count-up animation (which walks up to them). They have to use the same
 * function or the count-up would land on a subtly different string than the one
 * already on the page — a digit group separator appearing out of nowhere on the
 * last frame.
 *
 * Imported by `render-work-git-graph`, so this runs in Node at build time, and by
 * `commit-detail-sequence`, so it runs in the browser too. No DOM on either path.
 */

import type { ProjectMetric } from "../../content/projects";

/**
 * Pinned rather than locale-derived: the markup is formatted in Node at build
 * time and the count-up formats in the browser, and those two must agree.
 */
const NUMBER_LOCALE = "en-US";

/** Percentages keep two decimals; everything else is a whole number. */
export function formatMetricValue(value: number, suffix: ProjectMetric["suffix"]): string {
  if (suffix === "%") return `${value.toFixed(2)}%`;
  const rounded = Math.round(value);
  const formatted = rounded >= 1000 ? rounded.toLocaleString(NUMBER_LOCALE) : String(rounded);
  return formatted + suffix;
}

export function formatLineCount(value: number): string {
  return value.toLocaleString(NUMBER_LOCALE);
}

/** Total width of the added/removed bar, in block characters. */
const STAT_BAR_WIDTH = 22;
const STAT_BAR_CHARACTER = "▊";

export interface StatBars {
  readonly added: string;
  readonly removed: string;
}

/**
 * `git --stat`'s proportional bar. At least one block is always added, so a
 * commit that only removed lines still shows the ratio rather than reading as
 * a pure deletion.
 */
export function buildStatBars(linesAdded: number, linesRemoved: number): StatBars {
  const total = linesAdded + linesRemoved;
  const addedBlocks =
    total === 0 ? 1 : Math.max(1, Math.round((STAT_BAR_WIDTH * linesAdded) / total));
  return {
    added: STAT_BAR_CHARACTER.repeat(addedBlocks),
    removed: STAT_BAR_CHARACTER.repeat(STAT_BAR_WIDTH - addedBlocks),
  };
}

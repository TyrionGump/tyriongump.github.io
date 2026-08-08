/**
 * What plays inside a commit once it opens: the metrics count up, the source
 * file types itself out line by line, and its console output answers.
 *
 * Gated on visibility — the source viewer sits well below the fold on an open
 * commit, and a file that finished writing itself before the reader scrolled to
 * it is a file they never saw it write.
 *
 * Each run takes a token. A second run (opening the same commit again, or
 * switching to another) invalidates the first, so two staggered cascades cannot
 * interleave in the same element.
 */

import { CleanupScope } from "../../animation/cleanup-scope";
import { countUpNumber } from "../../animation/count-up-number";
import { prefersReducedMotion } from "../../animation/motion-preference";
import { runWhenVisible } from "../../animation/run-when-visible";
import type { Project } from "../../content/projects";
import { findAllElements, findElement } from "../../shared/dom-queries";
import { formatMetricValue } from "./commit-formatting";

const COUNT_UP_DURATION_MS = 1100;
/** Before the first code line appears. */
const CODE_CASCADE_START_MS = 120;
/** Between one code line and the next. */
const CODE_CASCADE_STEP_MS = 40;
/** After the last code line, before the console starts answering. */
const CONSOLE_START_MS = 130;
const CONSOLE_STEP_MS = 150;

/** Fallback line height if the viewer has not been laid out yet. */
const FALLBACK_LINE_HEIGHT_PX = 21;

export interface CommitDetailOptions {
  readonly row: HTMLElement;
  readonly project: Project;
  readonly scope: CleanupScope;
  /**
   * Called when the sequence adds height the row's `max-height` does not yet
   * account for, so the expansion controller can refit it.
   */
  readonly onContentGrew: () => void;
}

function countUpMetrics(options: CommitDetailOptions): void {
  const values = findAllElements(options.row, "[data-commit-metric-value]");
  values.forEach((element, index) => {
    const metric = options.project.metrics[index];
    if (!metric) return;
    countUpNumber({
      element,
      targetValue: metric.value,
      durationMs: COUNT_UP_DURATION_MS,
      formatValue: (value) => formatMetricValue(value, metric.suffix),
      scope: options.scope,
    });
  });
}

export function playCommitDetailSequence(options: CommitDetailOptions): void {
  const { row, scope, onContentGrew } = options;

  countUpMetrics(options);

  const codeBlock = findElement(row, "[data-source-code]");
  const consoleBlock = findElement(row, "[data-commit-console]");
  const lineHighlight = findElement(row, "[data-source-line-highlight]");
  if (!codeBlock || !consoleBlock) return;

  const codeLines = findAllElements(codeBlock, ".source-viewer-line");
  const consoleLines = findAllElements(consoleBlock, ".commit-console-line");

  if (prefersReducedMotion()) {
    // Everything is already in its final state in the markup; leave it there.
    return;
  }

  // Reset to the pre-cascade state. Doing this here rather than in the markup
  // means the baked HTML stays readable with scripting off.
  for (const line of [...codeLines, ...consoleLines]) line.classList.remove("is-revealed");
  if (lineHighlight) lineHighlight.classList.remove("is-active");

  const play = (): void => {
    const lineHeightPx = codeLines[0]?.offsetHeight || FALLBACK_LINE_HEIGHT_PX;

    codeLines.forEach((line, index) => {
      scope.setTimeout(
        () => {
          line.classList.add("is-revealed");

          // The highlight bar rides down the file the way a cursor would.
          if (lineHighlight) {
            lineHighlight.classList.add("is-active");
            lineHighlight.style.transform = `translateY(${index * lineHeightPx}px)`;
          }

          if (index !== codeLines.length - 1) return;

          // The file has finished; the console answers it.
          onContentGrew();
          consoleLines.forEach((consoleLine, consoleIndex) => {
            scope.setTimeout(
              () => consoleLine.classList.add("is-revealed"),
              CONSOLE_START_MS + consoleIndex * CONSOLE_STEP_MS,
            );
          });
        },
        CODE_CASCADE_START_MS + index * CODE_CASCADE_STEP_MS,
      );
    });
  };

  runWhenVisible(codeBlock, { threshold: 0.15, fallbackAfterMs: 1200 }, scope, play);
}

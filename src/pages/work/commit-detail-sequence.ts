// The code cascade waits until the source viewer is visible: it sits below the
// fold, and a cascade that ran off-screen would never be seen.

import { CleanupScope } from "../../lib/cleanup-scope";
import { countUpNumber } from "../../lib/motion/count-up-number";
import { prefersReducedMotion } from "../../lib/motion/motion-preference";
import { runWhenVisible } from "../../lib/motion/run-when-visible";
import { findAllElements, findElement } from "../../lib/dom-queries";
import { formatMetricValue } from "./commit-formatting";

const COUNT_UP_DURATION_MS = 1100;
const CODE_CASCADE_START_MS = 120;
const CODE_CASCADE_STEP_MS = 40;
const CONSOLE_START_MS = 130;
const CONSOLE_STEP_MS = 150;

/** Used while the viewer is not laid out and reports a height of 0. */
const FALLBACK_LINE_HEIGHT_PX = 21;

export interface CommitDetailOptions {
  readonly row: HTMLElement;
  readonly scope: CleanupScope;
  /** Called when the sequence adds height the row's `max-height` does not cover yet. */
  readonly onContentGrew: () => void;
}

function countUpMetrics(row: HTMLElement, scope: CleanupScope): void {
  for (const element of findAllElements(row, "[data-commit-metric-value]")) {
    const targetValue = Number(element.dataset["commitMetricValue"]);
    const suffix = element.dataset["commitMetricSuffix"] ?? "";
    if (!Number.isFinite(targetValue)) continue;
    countUpNumber({
      element,
      targetValue,
      durationMs: COUNT_UP_DURATION_MS,
      formatValue: (value) => formatMetricValue(value, suffix),
      scope,
    });
  }
}

/** Puts the code and its output in their final, shown state at once. */
export function showCommitDetail(row: HTMLElement): void {
  for (const line of findAllElements(row, "[data-source-line], [data-commit-console-line]")) {
    line.classList.add("is-revealed");
  }
}

export function playCommitDetailSequence(options: CommitDetailOptions): void {
  const { row, scope, onContentGrew } = options;

  countUpMetrics(row, scope);

  const codeBlock = findElement(row, "[data-source-code]");
  const consoleBlock = findElement(row, "[data-commit-console]");
  const lineHighlight = findElement(row, "[data-source-line-highlight]");
  if (!codeBlock || !consoleBlock) return;

  const codeLines = findAllElements(codeBlock, "[data-source-line]");
  const consoleLines = findAllElements(consoleBlock, "[data-commit-console-line]");

  if (prefersReducedMotion()) {
    showCommitDetail(row);
    return;
  }

  // Reset here, not in the markup, so the baked HTML reads fine without JavaScript.
  for (const line of [...codeLines, ...consoleLines]) line.classList.remove("is-revealed");
  if (lineHighlight) lineHighlight.classList.remove("is-active");

  const play = (): void => {
    const lineHeightPx = codeLines[0]?.offsetHeight || FALLBACK_LINE_HEIGHT_PX;

    codeLines.forEach((line, index) => {
      scope.setTimeout(
        () => {
          line.classList.add("is-revealed");

          if (lineHighlight) {
            lineHighlight.classList.add("is-active");
            lineHighlight.style.transform = `translateY(${index * lineHeightPx}px)`;
          }

          if (index !== codeLines.length - 1) return;

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

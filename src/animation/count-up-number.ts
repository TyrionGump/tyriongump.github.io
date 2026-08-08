/**
 * Counts a number up to its final value on an ease-out curve.
 *
 * Used by the metrics band when a commit opens. Pair it with
 * `font-variant-numeric: tabular-nums` in CSS or the digits jitter as they
 * change width, which turns a count-up into a flicker.
 */

import type { CleanupScope } from "./cleanup-scope";
import { prefersReducedMotion } from "./motion-preference";

export interface CountUpOptions {
  readonly element: HTMLElement;
  readonly targetValue: number;
  readonly durationMs: number;
  readonly formatValue: (value: number) => string;
  readonly scope: CleanupScope;
}

/** Fast at first, easing into the final value rather than stopping dead. */
function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

export function countUpNumber(options: CountUpOptions): void {
  const { element, targetValue, durationMs, formatValue, scope } = options;

  if (prefersReducedMotion()) {
    element.textContent = formatValue(targetValue);
    return;
  }

  const startedAt = performance.now();

  const step = (): void => {
    if (scope.isDisposed) return;
    const progress = Math.min(1, (performance.now() - startedAt) / durationMs);
    element.textContent = formatValue(targetValue * easeOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

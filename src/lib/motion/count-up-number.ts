// Pair with `font-variant-numeric: tabular-nums`, or the digits jitter as they change width.

import type { CleanupScope } from "../cleanup-scope";
import { prefersReducedMotion } from "./motion-preference";

export interface CountUpOptions {
  readonly element: HTMLElement;
  readonly targetValue: number;
  readonly durationMs: number;
  readonly formatValue: (value: number) => string;
  readonly scope: CleanupScope;
}

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

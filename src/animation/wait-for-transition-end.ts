/**
 * Waits for a CSS transition to actually finish.
 *
 * The git graph chains each stroke on the real end of the one above it rather
 * than on a running total of durations. Transitions land a frame or two after
 * their stated duration, so a total either races ahead — the next branch
 * starting before the trunk above it has landed — or needs padding that reads
 * as a pause.
 *
 * The timeout is a backstop, not the mechanism: `transitionend` never fires if
 * the property did not actually change — an element already at its target, or
 * one inside a page that is currently hidden — and a chain waiting on it would
 * stall forever. Both cases happen here, so the backstop is not theoretical.
 */

import type { CleanupScope } from "./cleanup-scope";

/** How long past the expected duration to wait before assuming the event is not coming. */
const TRANSITION_END_GRACE_MS = 260;

export function waitForTransitionEnd(
  element: HTMLElement | SVGElement,
  expectedDurationMs: number,
  scope: CleanupScope,
): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;

    const settle = (): void => {
      if (settled || scope.isDisposed) return;
      settled = true;
      element.removeEventListener("transitionend", settle);
      resolve();
    };

    element.addEventListener("transitionend", settle);
    scope.onDispose(() => element.removeEventListener("transitionend", settle));
    scope.setTimeout(settle, Math.round(expectedDurationMs) + TRANSITION_END_GRACE_MS);
  });
}

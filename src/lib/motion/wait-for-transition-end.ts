// The timeout is a backstop: `transitionend` never fires if nothing changed or the page is
// hidden, and a chain waiting on it would stall forever.

import type { CleanupScope } from "../cleanup-scope";

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

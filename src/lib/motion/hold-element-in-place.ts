// Corrects every frame because layout keeps moving after the first one. Reads the real
// `scrollY` each frame because the browser clamps scroll when the page shrinks.

import type { CleanupScope } from "../cleanup-scope";
import { prefersReducedMotion } from "./motion-preference";

const FOLLOW_FACTOR = 0.28;
/** Below this, snap, or it creeps forever. */
const SNAP_THRESHOLD_PX = 0.4;

export interface ScrollAnchor {
  abort(): void;
}

function maximumScrollY(): number {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function setOverflowAnchor(value: string): void {
  // Native scroll anchoring would fight this, holding the node it picked before the change.
  document.documentElement.style.setProperty("overflow-anchor", value);
  document.body.style.setProperty("overflow-anchor", value);
}

export function holdElementInPlace(
  element: HTMLElement,
  viewportOffsetPx: number,
  durationMs: number,
  scope: CleanupScope,
): ScrollAnchor {
  let aborted = false;
  let frameHandle: number | null = null;
  const startedAt = performance.now();
  // Reduced motion still needs the hold; it just arrives at once.
  const followFactor = prefersReducedMotion() ? 1 : FOLLOW_FACTOR;

  const release = (): void => {
    if (frameHandle !== null) cancelAnimationFrame(frameHandle);
    frameHandle = null;
    setOverflowAnchor("");
  };

  const step = (): void => {
    if (aborted || scope.isDisposed) {
      release();
      return;
    }

    const actualScrollY = window.scrollY;
    const target = Math.max(
      0,
      Math.min(
        maximumScrollY(),
        actualScrollY + element.getBoundingClientRect().top - viewportOffsetPx,
      ),
    );

    let next = actualScrollY + (target - actualScrollY) * followFactor;
    if (Math.abs(target - next) < SNAP_THRESHOLD_PX) next = target;
    window.scrollTo(0, next);

    if (performance.now() - startedAt < durationMs) frameHandle = requestAnimationFrame(step);
    else release();
  };

  setOverflowAnchor("none");
  frameHandle = requestAnimationFrame(step);
  scope.onDispose(release);

  return {
    abort() {
      aborted = true;
      release();
    },
  };
}

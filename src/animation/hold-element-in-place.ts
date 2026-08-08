/**
 * Keeps an element pinned at a fixed offset from the top of the viewport while
 * the document reflows underneath it.
 *
 * Opening a commit adds hundreds of pixels above the fold and, when switching
 * between commits, removes a similar amount in the same layout pass. Without
 * this, the row you clicked jumps out from under the cursor.
 *
 * It lerp-follows rather than correcting once, because layout keeps moving after
 * the click — fonts settle, the body refits as the source viewer fills in. A
 * single correction is right for one frame and wrong for the next thirty. And it
 * reads the real `window.scrollY` every frame: when the document shrinks the
 * browser clamps the scroll, and a tracked virtual position silently desyncs.
 */

import type { CleanupScope } from "./cleanup-scope";
import { prefersReducedMotion } from "./motion-preference";

/** How much of the remaining distance to close each frame. */
const FOLLOW_FACTOR = 0.28;
/** Below this, snap — otherwise it creeps forever. */
const SNAP_THRESHOLD_PX = 0.4;

export interface ScrollAnchor {
  abort(): void;
}

function maximumScrollY(): number {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function setOverflowAnchor(value: string): void {
  // Native scroll anchoring would fight us for control, holding onto whichever
  // node it picked before the layout changed.
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
  // Reduced motion still wants the element held — it is compensation, not
  // decoration — but it should arrive at once rather than gliding.
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

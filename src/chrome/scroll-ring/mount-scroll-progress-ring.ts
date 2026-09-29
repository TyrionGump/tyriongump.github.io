import { CleanupScope, type CleanupFunction } from "../../lib/cleanup-scope";
import { prefersReducedMotion } from "../../lib/motion/motion-preference";
import { findElement } from "../../lib/dom-queries";
import { scrollRingCircumference } from "./render-scroll-progress-ring";

const MINIMUM_TRAVEL_RATIO = 0.6;
/** Ignore the first few pixels so the ring does not flicker at rest. */
const MINIMUM_SCROLL_PX = 12;

export function mountScrollProgressRing(ring: HTMLElement): CleanupFunction {
  const scope = new CleanupScope();
  const arc = findElement<SVGCircleElement>(ring, "[data-scroll-ring-arc]");

  let isVisible = false;
  let repaintQueued = false;

  const repaint = (): void => {
    repaintQueued = false;
    const doc = document.documentElement;
    const maximumScroll = doc.scrollHeight - doc.clientHeight;
    const scrollY = window.scrollY;

    const shouldShow =
      maximumScroll > doc.clientHeight * MINIMUM_TRAVEL_RATIO && scrollY > MINIMUM_SCROLL_PX;

    if (shouldShow !== isVisible) {
      isVisible = shouldShow;
      ring.classList.toggle("is-visible", shouldShow);
    }
    if (!shouldShow || !arc) return;

    const progress = Math.max(0, Math.min(1, scrollY / maximumScroll));
    arc.setAttribute("stroke-dashoffset", (scrollRingCircumference * (1 - progress)).toFixed(2));
  };

  const requestRepaint = (): void => {
    if (repaintQueued || scope.isDisposed) return;
    repaintQueued = true;
    requestAnimationFrame(repaint);
  };

  scope.addEventListener(window, "scroll", requestRepaint, { passive: true });
  scope.addEventListener(window, "resize", requestRepaint);

  // The page can change height without a scroll or resize event, so watch the body too.
  const resizeObserver = new ResizeObserver(requestRepaint);
  resizeObserver.observe(document.body);
  scope.onDispose(() => resizeObserver.disconnect());

  scope.addEventListener(ring, "click", () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  });

  repaint();

  return () => scope.dispose();
}

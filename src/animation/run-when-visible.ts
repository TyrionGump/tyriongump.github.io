/**
 * Runs a callback the first time an element scrolls into view.
 *
 * Nothing on this site should play out of sight — a sequence that finished
 * before the reader arrived is a sequence they never saw. Session segments and
 * the source viewer both hang off this.
 *
 * The observer disconnects after firing, so the callback runs exactly once.
 */

import type { CleanupScope } from "./cleanup-scope";

export interface RunWhenVisibleOptions {
  readonly threshold: number;
  /**
   * Runs the callback anyway after this long if the element is already close to
   * the viewport. Covers the case where the element is on screen at mount but
   * the observer's first callback is missed because the page was hidden.
   */
  readonly fallbackAfterMs?: number;
  /** How near the viewport counts as "close enough" for the fallback. */
  readonly fallbackViewportMultiple?: number;
}

export function runWhenVisible(
  element: Element,
  options: RunWhenVisibleOptions,
  scope: CleanupScope,
  callback: () => void,
): void {
  let hasRun = false;

  const runOnce = (): void => {
    if (hasRun || scope.isDisposed) return;
    hasRun = true;
    observer.disconnect();
    callback();
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio > options.threshold) runOnce();
      }
    },
    { threshold: [options.threshold] },
  );

  observer.observe(element);
  scope.onDispose(() => observer.disconnect());

  if (options.fallbackAfterMs !== undefined) {
    const viewportMultiple = options.fallbackViewportMultiple ?? 1.15;
    scope.setTimeout(() => {
      if (element.getBoundingClientRect().top < window.innerHeight * viewportMultiple) runOnce();
    }, options.fallbackAfterMs);
  }
}

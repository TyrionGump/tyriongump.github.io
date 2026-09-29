import type { CleanupScope } from "../cleanup-scope";

export interface RunWhenVisibleOptions {
  readonly threshold: number;
  /**
   * Runs the callback after this long if the element is near the viewport.
   * The observer can miss its first callback while the page is hidden.
   */
  readonly fallbackAfterMs?: number;
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

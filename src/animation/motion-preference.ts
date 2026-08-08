/**
 * `prefers-reduced-motion` support.
 *
 * The rule: with reduced motion every scripted sequence renders in its *final*
 * state — text complete, the git graph drawn, count-ups at their final value,
 * carets not blinking. Nothing is hidden; only the choreography is skipped.
 *
 * The animation primitives check this themselves, so most call sites never ask.
 */

import type { CleanupScope } from "./cleanup-scope";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function watchMotionPreference(
  scope: CleanupScope,
  onChange: (isReduced: boolean) => void,
): void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  scope.addEventListener<MediaQueryListEvent>(query, "change", (event) => onChange(event.matches));
}

/**
 * Types text into an element one character at a time.
 *
 * The per-character delay is randomised inside a range. That randomness is the
 * whole point: a fixed interval reads as a ticker, a jittered one reads as a
 * person at a keyboard. Each caller passes its own range because the site types
 * at different speeds in different places: a command you are meant to read lands
 * slower than one that is only scene-setting.
 *
 * Text is written with `textContent`, never `innerHTML` — a partially typed
 * string would otherwise be able to open a tag it never closes.
 */

import type { CleanupScope } from "./cleanup-scope";
import { prefersReducedMotion } from "./motion-preference";

export interface TypingSpeed {
  readonly minimumDelayMs: number;
  readonly maximumDelayMs: number;
}

export interface TypeTextOptions {
  readonly scope: CleanupScope;
  readonly speed: TypingSpeed;
  /** Beat before the first character, so the line does not start the instant it appears. */
  readonly startDelayMs?: number;
}

function randomDelayWithin(speed: TypingSpeed): number {
  const spread = speed.maximumDelayMs - speed.minimumDelayMs;
  return speed.minimumDelayMs + Math.random() * spread;
}

/**
 * Resolves once the full text is on screen.
 *
 * If the scope is disposed mid-flight the returned promise never settles, which
 * abandons the rest of the sequence awaiting it. That is intentional: it
 * replaces an `if (dead) return` check after every single step.
 */
export async function typeTextIntoElement(
  element: HTMLElement,
  text: string,
  options: TypeTextOptions,
): Promise<void> {
  if (prefersReducedMotion()) {
    element.textContent = text;
    return;
  }

  element.textContent = "";
  if (options.startDelayMs !== undefined) {
    await options.scope.delay(options.startDelayMs);
  }

  // Each character waits out the pause after the one before it; concurrently
  // would put the whole string on screen in a single frame.
  /* oxlint-disable no-await-in-loop -- a typewriter is inherently serial */
  for (let length = 1; length <= text.length; length += 1) {
    element.textContent = text.slice(0, length);
    if (length < text.length) {
      await options.scope.delay(randomDelayWithin(options.speed));
    }
  }
  /* oxlint-enable no-await-in-loop */
}

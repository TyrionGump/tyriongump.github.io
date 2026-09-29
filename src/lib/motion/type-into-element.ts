// Use `textContent`, never `innerHTML`: a partly typed string could open a tag it never closes.

import type { CleanupScope } from "../cleanup-scope";
import { prefersReducedMotion } from "./motion-preference";

export interface TypingSpeed {
  readonly minimumDelayMs: number;
  readonly maximumDelayMs: number;
}

export interface TypeTextOptions {
  readonly scope: CleanupScope;
  readonly speed: TypingSpeed;
  readonly startDelayMs?: number;
}

function randomDelayWithin(speed: TypingSpeed): number {
  const spread = speed.maximumDelayMs - speed.minimumDelayMs;
  return speed.minimumDelayMs + Math.random() * spread;
}

/** Never settles if the scope is disposed mid-flight, which abandons the awaiting sequence. */
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

  /* oxlint-disable no-await-in-loop -- a typewriter is inherently serial */
  for (let length = 1; length <= text.length; length += 1) {
    element.textContent = text.slice(0, length);
    if (length < text.length) {
      await options.scope.delay(randomDelayWithin(options.speed));
    }
  }
  /* oxlint-enable no-await-in-loop */
}

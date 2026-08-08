/**
 * The Home page's typed choreography.
 *
 * Every delay below is deliberate and comes from the design. The two commands
 * type at different speeds on purpose: `whoami` is the line you are meant to
 * read, `open` is scene-setting for the menu underneath it.
 *
 * It is a flat `async` function because that is what it is — a script with
 * pauses. Every `await` goes through the `CleanupScope`, so navigating away
 * mid-sequence leaves the pending delay unresolved and the rest of the function
 * simply abandoned. No "is this still the current run?" check after every step.
 */

import type { CleanupScope } from "../../animation/cleanup-scope";
import { typeTextIntoElement, type TypingSpeed } from "../../animation/type-into-element";
import { homeIntroCommand, homeMenuCommand } from "../../content/home-page-content";
import { requireElement } from "../../shared/dom-queries";
import { appendFragment, forceStyleReflow } from "../../shared/dom-rendering";
import {
  renderHomeCommandLine,
  renderHomeIntroOutput,
  renderHomeNavigationMenu,
} from "./render-home-terminal-panel";

/** A human at a keyboard, not a ticker: every character lands at a slightly different pace. */
const INTRO_COMMAND_TYPING_SPEED: TypingSpeed = { minimumDelayMs: 36, maximumDelayMs: 70 };
const MENU_COMMAND_TYPING_SPEED: TypingSpeed = { minimumDelayMs: 52, maximumDelayMs: 92 };

/** A beat before the first character, so the panel is settled before anything moves. */
const DELAY_BEFORE_FIRST_CHARACTER_MS = 420;
/** The pause between pressing Enter and the shell answering. */
const DELAY_BEFORE_OUTPUT_RETURNS_MS = 180;
/** Long enough to read the answer before the next prompt appears. */
const DELAY_BEFORE_FOLLOW_UP_PROMPT_MS = 620;
const DELAY_BEFORE_FOLLOW_UP_COMMAND_MS = 220;
/** The shell "thinking" before it asks which door you want. */
const DELAY_BEFORE_MENU_APPEARS_MS = 260;

function appendCaret(commandLine: HTMLElement): HTMLElement {
  const caret = document.createElement("span");
  caret.className = "caret";
  caret.setAttribute("aria-hidden", "true");
  commandLine.appendChild(caret);
  return caret;
}

/**
 * Plays the session into `stage` and resolves with the live menu element.
 *
 * Never resolves if the scope is disposed part-way, by design — see the module
 * comment.
 */
export async function playHomeIntroSequence(
  stage: HTMLElement,
  scope: CleanupScope,
): Promise<HTMLElement> {
  const introCommandLine = appendFragment(stage, renderHomeCommandLine(homeIntroCommand));
  const introCaret = appendCaret(introCommandLine);

  await typeTextIntoElement(
    requireElement(introCommandLine, "[data-home-terminal-command]"),
    homeIntroCommand,
    { scope, speed: INTRO_COMMAND_TYPING_SPEED, startDelayMs: DELAY_BEFORE_FIRST_CHARACTER_MS },
  );

  // The command has been submitted; the caret is no longer on this line.
  introCaret.remove();
  await scope.delay(DELAY_BEFORE_OUTPUT_RETURNS_MS);

  // Output lands all at once on a single fade. A real terminal returns its
  // output in one beat, and staggering it line by line reads as decoration.
  appendFragment(stage, renderHomeIntroOutput());
  await scope.delay(DELAY_BEFORE_FOLLOW_UP_PROMPT_MS);

  const menuCommandLine = appendFragment(
    stage,
    renderHomeCommandLine(homeMenuCommand, { isFollowUp: true }),
  );
  const menuCaret = appendCaret(menuCommandLine);

  // Appended now but still transparent, so revealing it later cannot shift
  // anything that is already on screen.
  const menu = appendFragment(stage, renderHomeNavigationMenu());

  await typeTextIntoElement(
    requireElement(menuCommandLine, "[data-home-terminal-command]"),
    homeMenuCommand,
    { scope, speed: MENU_COMMAND_TYPING_SPEED, startDelayMs: DELAY_BEFORE_FOLLOW_UP_COMMAND_MS },
  );

  await scope.delay(DELAY_BEFORE_MENU_APPEARS_MS);

  // The caret hands over to the menu: the shell is now waiting on a choice
  // rather than on more typing.
  menuCaret.remove();
  forceStyleReflow(menu);
  menu.classList.add("is-revealed");

  return menu;
}

import type { CleanupScope } from "../../lib/cleanup-scope";
import { typeTextIntoElement, type TypingSpeed } from "../../lib/motion/type-into-element";
import { homeIntroCommand, homeMenuCommand } from "../../content/home-page-content";
import { requireElement } from "../../lib/dom-queries";
import { appendFragment, forceStyleReflow } from "../../lib/dom-rendering";
import {
  renderHomeCommandLine,
  renderHomeIntroOutput,
  renderHomeNavigationMenu,
} from "./render-home-page";

const INTRO_COMMAND_TYPING_SPEED: TypingSpeed = { minimumDelayMs: 36, maximumDelayMs: 70 };
const MENU_COMMAND_TYPING_SPEED: TypingSpeed = { minimumDelayMs: 52, maximumDelayMs: 92 };

const DELAY_BEFORE_FIRST_CHARACTER_MS = 420;
const DELAY_BEFORE_OUTPUT_RETURNS_MS = 180;
const DELAY_BEFORE_FOLLOW_UP_PROMPT_MS = 620;
const DELAY_BEFORE_FOLLOW_UP_COMMAND_MS = 220;
const DELAY_BEFORE_MENU_APPEARS_MS = 260;

function appendCaret(commandLine: HTMLElement): HTMLElement {
  const caret = document.createElement("span");
  caret.className = "caret";
  caret.setAttribute("aria-hidden", "true");
  commandLine.appendChild(caret);
  return caret;
}

/**
 * Resolves with the live menu. Every wait goes through `scope`, so disposing it
 * leaves the promise pending and the rest of the sequence never runs.
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

  introCaret.remove();
  await scope.delay(DELAY_BEFORE_OUTPUT_RETURNS_MS);

  appendFragment(stage, renderHomeIntroOutput());
  await scope.delay(DELAY_BEFORE_FOLLOW_UP_PROMPT_MS);

  const menuCommandLine = appendFragment(
    stage,
    renderHomeCommandLine(homeMenuCommand, { isFollowUp: true }),
  );
  const menuCaret = appendCaret(menuCommandLine);

  // Append the menu now, while transparent, so revealing it later shifts nothing.
  const menu = appendFragment(stage, renderHomeNavigationMenu());

  await typeTextIntoElement(
    requireElement(menuCommandLine, "[data-home-terminal-command]"),
    homeMenuCommand,
    { scope, speed: MENU_COMMAND_TYPING_SPEED, startDelayMs: DELAY_BEFORE_FOLLOW_UP_COMMAND_MS },
  );

  await scope.delay(DELAY_BEFORE_MENU_APPEARS_MS);

  menuCaret.remove();
  forceStyleReflow(menu);
  menu.classList.add("is-revealed");

  return menu;
}

/**
 * Brings the Work page to life: types the command, draws the graph, and turns
 * the commit rows into an accordion.
 *
 * The markup arrives fully drawn and fully expanded — that is what ships in the
 * HTML and what a reader without JavaScript gets. Everything here is the
 * enhancement layered on top.
 */

import { CleanupScope } from "../../animation/cleanup-scope";
import { prefersReducedMotion } from "../../animation/motion-preference";
import { typeTextIntoElement, type TypingSpeed } from "../../animation/type-into-element";
import type { MountedPage } from "../../routing/page-lifecycle";
import { requireElement } from "../../shared/dom-queries";
import { mountCommitExpansion } from "./commit-row-expansion";
import { createGraphDrawSequence } from "./graph-draw-sequence";
import { workCommandText } from "./render-work-git-graph";

/**
 * Faster than the Home intro. This command is scene-setting — you are meant to
 * recognise it, not read it word by word — and the graph is waiting behind it.
 */
const COMMAND_TYPING_SPEED: TypingSpeed = { minimumDelayMs: 29, maximumDelayMs: 36 };
const COMMAND_START_DELAY_MS = 200;

export function mountWorkGitGraph(page: HTMLElement): MountedPage {
  const scope = new CleanupScope();
  const graphRoot = requireElement(page, "[data-work-graph]");

  void typeTextIntoElement(requireElement(page, "[data-work-command]"), workCommandText, {
    scope,
    speed: COMMAND_TYPING_SPEED,
    startDelayMs: COMMAND_START_DELAY_MS,
  });

  const drawController = createGraphDrawSequence(graphRoot, scope);
  if (prefersReducedMotion()) drawController.snapToFinalState();
  else drawController.play();

  const expansion = mountCommitExpansion(graphRoot, drawController, scope);

  return {
    dispose: () => scope.dispose(),
    // An open commit was measured while the page was visible. Coming back, the
    // content may have reflowed at a different width while it was hidden.
    onReturn: () => expansion.refitOpenCommit(),
  };
}

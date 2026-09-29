/**
 * Brings the Work page to life: types the command, draws the graph, and turns
 * the commit rows into an accordion. The markup ships fully drawn and expanded,
 * which is what a reader without JavaScript gets.
 *
 * The graph draws once per session. A return visit shows it finished, with the
 * commit that was open still open.
 */

import { projectIds, type ProjectId } from "../../content/projects";
import { CleanupScope } from "../../lib/cleanup-scope";
import { requireElement } from "../../lib/dom-queries";
import { prefersReducedMotion } from "../../lib/motion/motion-preference";
import { typeTextIntoElement, type TypingSpeed } from "../../lib/motion/type-into-element";
import { readSessionValue, writeSessionValue } from "../../lib/session-store";
import { mountCommitExpansion } from "./commit-row-expansion";
import { createGraphDrawSequence } from "./graph-draw-sequence";
import { workCommandText } from "./render-work-page";

const COMMAND_TYPING_SPEED: TypingSpeed = { minimumDelayMs: 29, maximumDelayMs: 36 };
const COMMAND_START_DELAY_MS = 200;

const SESSION_KEY = "work-page";

interface WorkPageState {
  readonly hasDrawn: boolean;
  readonly openCommitId: ProjectId | null;
}

function readState(): WorkPageState {
  const stored = readSessionValue(SESSION_KEY) as Partial<WorkPageState> | null;
  const openCommitId = projectIds.find((id) => id === stored?.openCommitId) ?? null;
  return { hasDrawn: stored?.hasDrawn === true, openCommitId };
}

export function mountWorkPage(main: HTMLElement): void {
  const scope = new CleanupScope();
  const graphRoot = requireElement(main, "[data-work-graph]");
  const command = requireElement(main, "[data-work-command]");

  let state = readState();
  const saveState = (change: Partial<WorkPageState>): void => {
    state = { ...state, ...change };
    writeSessionValue(SESSION_KEY, state);
  };

  const drawController = createGraphDrawSequence(graphRoot, scope);
  if (state.hasDrawn || prefersReducedMotion()) {
    command.textContent = workCommandText;
    drawController.snapToFinalState();
  } else {
    void typeTextIntoElement(command, workCommandText, {
      scope,
      speed: COMMAND_TYPING_SPEED,
      startDelayMs: COMMAND_START_DELAY_MS,
    });
    drawController.play();
    saveState({ hasDrawn: true });
  }

  mountCommitExpansion(graphRoot, drawController, scope, {
    initialOpenCommitId: state.openCommitId,
    onOpenCommitChange: (openCommitId) => saveState({ openCommitId }),
  });
}

/**
 * Draws the git graph like a pen.
 *
 * Two properties make it read as drawing rather than as decoration, and both are
 * easy to lose in a refactor:
 *
 *  1. **One constant speed.** Every stroke moves at `penSpeedPxPerMs`, and the
 *     corner is timed by its own arc length rather than its duration being
 *     guessed — otherwise the bend crawls while the verticals race.
 *  2. **Rows chain on the real `transitionend` of the stroke above them**, never
 *     on a running total of durations — see `wait-for-transition-end.ts` for
 *     why a total cannot be made to work.
 *
 * Easing is `linear` throughout, for the same reason: a pen travels at one pace.
 *
 * The sequence runs on its own child scope. Disposing that scope abandons the
 * chain wherever it happens to be — which is exactly what a click during the
 * draw needs, since the row it lands on must snap to its finished state
 * immediately rather than queue behind the animation.
 */

import { CleanupScope } from "../../animation/cleanup-scope";
import { waitForTransitionEnd } from "../../animation/wait-for-transition-end";
import { findAllElements, findElement } from "../../shared/dom-queries";
import { branchCurveStartY, graphGeometry as geometry, strokeDurationMs } from "./graph-geometry";

/** How long the whole drawing waits after mount, so the command finishes typing first. */
const DELAY_BEFORE_DRAW_MS = 1620;
/** A beat between the HEAD node landing and its trunk starting to run. */
const DELAY_AFTER_HEAD_NODE_MS = 120;
/** The branch node lands as the corner finishes; the text follows just behind it. */
const DELAY_TEXT_AFTER_BRANCH_MS = 140;
/** How long the trunk pauses at the peel point while the branch grows out of it. */
const TRUNK_PAUSE_AT_PEEL_MS = 80;

const CURVE_DURATION_MS = Math.round(geometry.curvePathLength / geometry.penSpeedPxPerMs);
const TO_PEEL_DURATION_MS = Math.round(branchCurveStartY / geometry.penSpeedPxPerMs);

function reveal(row: HTMLElement, selector: string): void {
  const element = findElement(row, selector);
  if (element) element.style.opacity = "1";
}

/** Re-cuts a row's dash to exactly its height, and marks it as drawn. */
function finishRowTrunkPath(row: HTMLElement): void {
  const path = findElement<SVGPathElement>(row, "[data-graph-trunk-path]");
  if (!path) return;
  path.style.strokeDashoffset = String(geometry.trunkPathLength - row.offsetHeight);
  row.dataset["graphDrawn"] = "";
}

export interface GraphDrawController {
  /** Starts the draw after its opening delay. Safe to call once. */
  play(): void;
  /** Puts every stroke, node and text block in its finished state immediately. */
  snapToFinalState(): void;
  /**
   * Re-cuts a row's trunk dash after its height changed. Opening a commit grows
   * a row by hundreds of pixels, and the trunk is a fixed-length dash rather
   * than a scaled box, so it does not follow on its own.
   */
  syncRowTrunk(row: HTMLElement): void;
}

function setStrokeDuration(element: Element, durationMs: number): void {
  (element as HTMLElement).style.transitionDuration = `${Math.max(0, Math.round(durationMs))}ms`;
}

/** Runs a dashed stroke to `offset`. Called twice per commit row — down to the
 *  peel point, then on to the row's foot — so the pen can stop and start again
 *  on the same path without the line ever showing a seam. */
function runDashTo(path: SVGPathElement, offset: number, durationMs: number): void {
  setStrokeDuration(path, durationMs);
  path.style.strokeDashoffset = String(offset);
}

export function createGraphDrawSequence(
  graphRoot: HTMLElement,
  parentScope: CleanupScope,
): GraphDrawController {
  const drawScope = new CleanupScope();
  parentScope.onDispose(() => drawScope.dispose());

  let hasStarted = false;
  let hasSnapped = false;

  const rows = findAllElements(graphRoot, ".graph-row");

  async function drawHeadRow(row: HTMLElement): Promise<void> {
    reveal(row, "[data-graph-node]");
    await drawScope.delay(DELAY_AFTER_HEAD_NODE_MS);

    const trunk = findElement(row, "[data-graph-trunk]");
    if (!trunk) return;

    const durationMs = strokeDurationMs(trunk.offsetHeight);
    setStrokeDuration(trunk, durationMs);
    trunk.style.transform = "scaleY(1)";
    reveal(row, "[data-graph-text]");

    await waitForTransitionEnd(trunk, durationMs, drawScope);
  }

  /**
   * One stroke through the row: it runs down to the peel point, waits while the
   * branch grows out of it and sets its node, then carries on to the row's foot.
   */
  async function drawCommitRow(row: HTMLElement): Promise<void> {
    const trunkPath = findElement<SVGPathElement>(row, "[data-graph-trunk-path]");
    const curvePath = findElement<SVGPathElement>(row, "[data-graph-curve-path]");
    if (!trunkPath || !curvePath) return;

    const rowHeight = row.offsetHeight || 40;
    const toFootDurationMs = strokeDurationMs(rowHeight - branchCurveStartY);

    runDashTo(trunkPath, geometry.trunkPathLength - branchCurveStartY, TO_PEEL_DURATION_MS);
    await drawScope.delay(TO_PEEL_DURATION_MS);

    runDashTo(curvePath, 0, CURVE_DURATION_MS);
    drawScope.setTimeout(() => reveal(row, "[data-graph-node]"), CURVE_DURATION_MS);
    drawScope.setTimeout(
      () => reveal(row, "[data-graph-text]"),
      CURVE_DURATION_MS + DELAY_TEXT_AFTER_BRANCH_MS,
    );

    await drawScope.delay(CURVE_DURATION_MS + TRUNK_PAUSE_AT_PEEL_MS);

    runDashTo(trunkPath, geometry.trunkPathLength - rowHeight, toFootDurationMs);
    row.dataset["graphDrawn"] = "";

    await waitForTransitionEnd(trunkPath, toFootDurationMs, drawScope);
  }

  async function drawRootRow(row: HTMLElement): Promise<void> {
    const trunk = findElement(row, "[data-graph-trunk]");
    if (!trunk) return;

    const durationMs = strokeDurationMs(trunk.offsetHeight);
    setStrokeDuration(trunk, durationMs);
    trunk.style.transform = "scaleY(1)";

    await waitForTransitionEnd(trunk, durationMs, drawScope);
    reveal(row, "[data-graph-node]");
    reveal(row, "[data-graph-text]");
  }

  /**
   * Sequential on purpose — this is the pen. Each `await` is a row waiting for
   * the real `transitionend` of the stroke above it; `Promise.all` would start
   * the trunk, both branches and the root in the same frame, racing rather than
   * handing off.
   */
  async function drawEveryRow(): Promise<void> {
    /* oxlint-disable no-await-in-loop -- sequential by design; see above */
    for (const row of rows) {
      if (row.classList.contains("graph-row-head")) await drawHeadRow(row);
      else if (row.classList.contains("graph-row-root")) await drawRootRow(row);
      else await drawCommitRow(row);
    }
    /* oxlint-enable no-await-in-loop */
  }

  return {
    play() {
      if (hasStarted) return;
      hasStarted = true;
      drawScope.setTimeout(() => {
        if (hasSnapped) return;
        void drawEveryRow();
      }, DELAY_BEFORE_DRAW_MS);
    },

    snapToFinalState() {
      if (hasSnapped) return;
      hasSnapped = true;
      hasStarted = true;
      // Abandons the chain wherever it is, so nothing lands on top of the
      // finished state a frame later.
      drawScope.dispose();

      for (const row of rows) {
        const trunk = findElement(row, "[data-graph-trunk]");
        if (trunk) {
          trunk.style.transitionDuration = "0ms";
          trunk.style.transform = "scaleY(1)";
        }

        const curvePath = findElement<SVGPathElement>(row, "[data-graph-curve-path]");
        if (curvePath) {
          curvePath.style.transitionDuration = "0ms";
          curvePath.style.strokeDashoffset = "0";
        }

        const trunkPath = findElement<SVGPathElement>(row, "[data-graph-trunk-path]");
        if (trunkPath) trunkPath.style.transitionDuration = "0ms";
        finishRowTrunkPath(row);

        reveal(row, "[data-graph-node]");
        reveal(row, "[data-graph-text]");
      }
    },

    syncRowTrunk(row) {
      if (!("graphDrawn" in row.dataset)) return;
      const path = findElement<SVGPathElement>(row, "[data-graph-trunk-path]");
      if (!path) return;
      path.style.transitionDuration = "0ms";
      path.style.strokeDashoffset = String(geometry.trunkPathLength - row.offsetHeight);
    },
  };
}

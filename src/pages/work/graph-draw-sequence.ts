import { CleanupScope } from "../../lib/cleanup-scope";
import { waitForTransitionEnd } from "../../lib/motion/wait-for-transition-end";
import { findAllElements, findElement } from "../../lib/dom-queries";
import { branchCurveStartY, graphGeometry as geometry, strokeDurationMs } from "./graph-geometry";

const DELAY_AFTER_HEAD_NODE_MS = 120;
const DELAY_TEXT_AFTER_BRANCH_MS = 140;
const TRUNK_PAUSE_AT_PEEL_MS = 80;

const CURVE_DURATION_MS = Math.round(geometry.curvePathLength / geometry.penSpeedPxPerMs);
const TO_PEEL_DURATION_MS = Math.round(branchCurveStartY / geometry.penSpeedPxPerMs);

function reveal(row: HTMLElement, selector: string): void {
  const element = findElement(row, selector);
  if (element) element.style.opacity = "1";
}

function finishRowTrunkPath(row: HTMLElement): void {
  const path = findElement<SVGPathElement>(row, "[data-graph-trunk-path]");
  if (!path) return;
  path.style.strokeDashoffset = String(geometry.trunkPathLength - row.offsetHeight);
  row.dataset["graphDrawn"] = "";
}

export interface GraphDrawController {
  /** Does nothing after the first call or after a snap. */
  play(): void;
  snapToFinalState(): void;
  /** Call after a row's height changes: the trunk is a fixed-length dash and does not follow. */
  syncRowTrunk(row: HTMLElement): void;
}

function setStrokeDuration(element: Element, durationMs: number): void {
  (element as HTMLElement).style.transitionDuration = `${Math.max(0, Math.round(durationMs))}ms`;
}

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

  const rows = findAllElements(graphRoot, "[data-graph-row]");

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
   * Each row waits for the real `transitionend` of the stroke above it. Transitions
   * land a frame or two late, so a sum of durations would start rows too early.
   */
  async function drawEveryRow(): Promise<void> {
    /* oxlint-disable no-await-in-loop -- sequential by design; see above */
    for (const row of rows) {
      const kind = row.dataset["graphRow"];
      if (kind === "head") await drawHeadRow(row);
      else if (kind === "root") await drawRootRow(row);
      else await drawCommitRow(row);
    }
    /* oxlint-enable no-await-in-loop */
  }

  return {
    play() {
      if (hasStarted) return;
      hasStarted = true;
      void drawEveryRow();
    },

    snapToFinalState() {
      if (hasSnapped) return;
      hasSnapped = true;
      hasStarted = true;
      // Stop the chain first, so no pending step lands on the finished state.
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

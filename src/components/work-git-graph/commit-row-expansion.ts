/**
 * Opening and closing commits.
 *
 * Only one is open at a time; opening one closes the other. Most of the code
 * here is not about the accordion — it is about the document not moving under
 * the reader while ~1000px of content appears and disappears. That behaviour is
 * subtle, easy to break, and worth preserving deliberately:
 *
 *  - **The clicked row is pinned.** Its distance from the top of the viewport is
 *    measured before the change and held afterwards, so opening never pulls the
 *    viewport around.
 *
 *  - **Switching collapses the outgoing body instantly**, because the anchor
 *    would otherwise be chasing a target that is itself moving a thousand pixels.
 *
 *  - **Closing shrinks it over time instead.** Folding removes that height in one
 *    pass; if that drops the maximum scroll below where the reader is, the
 *    browser clamps instantly and the viewport teleports. Shrinking gradually
 *    lets the clamp arrive gradually and the anchor ride it down. Clamping is
 *    lossy — once it happens the position cannot be recovered.
 */

import { CleanupScope, type CleanupFunction } from "../../animation/cleanup-scope";
import { holdElementInPlace, type ScrollAnchor } from "../../animation/hold-element-in-place";
import { projects, type ProjectId } from "../../content/projects";
import { findAllElements, findElement, requireElement } from "../../shared/dom-queries";
import { forceStyleReflow } from "../../shared/dom-rendering";
import { playCommitDetailSequence } from "./commit-detail-sequence";
import type { GraphDrawController } from "./graph-draw-sequence";

/** Slack above the measured content height, so a late reflow cannot clip it. */
const BODY_HEIGHT_SLACK_PX = 48;
/** How long to keep pinning after a click, covering late reflows. */
const ANCHOR_DURATION_MS = 1500;
/** Must outlast the collapse transition before the shrink rule is removed. */
const COLLAPSE_TRANSITION_CLEANUP_MS = 500;

const commitIdOf = (row: HTMLElement): ProjectId => row.dataset["commit"] as ProjectId;

export interface CommitExpansionController {
  /**
   * Re-measures the open commit. Needed on resize, and on returning to the page:
   * a hidden element reports a height of zero, so the fit made while the page
   * was displaced would have clipped the body away.
   */
  refitOpenCommit(): void;
}

export function mountCommitExpansion(
  graphRoot: HTMLElement,
  drawController: GraphDrawController,
  scope: CleanupScope,
): CommitExpansionController {
  const rows = findAllElements(graphRoot, "[data-commit]");
  let openCommitId: ProjectId | null = null;
  let scrollAnchor: ScrollAnchor | null = null;
  /** Owns the running detail sequence, so opening again cancels the last one. */
  let detailScope: CleanupScope | null = null;

  /**
   * Sizes an open body to its content. Returns false when it cannot be measured
   * safely — a body that is not laid out reports zero, and writing that height
   * would collapse an open commit to nothing.
   */
  const fitBody = (body: HTMLElement): boolean => {
    if (!body.offsetParent) return false;

    // A closed row's detail cascade can still be running; without this it would
    // re-inflate a body that has already been collapsed, leaving a tall
    // invisible gap in the middle of the log.
    const owner = body.closest<HTMLElement>("[data-commit]");
    if (!owner || commitIdOf(owner) !== openCommitId) return false;

    const inner = findElement(body, "[data-commit-body-inner]");
    const contentHeight = inner?.scrollHeight ?? 0;
    if (!contentHeight) return false;

    body.style.maxHeight = `${contentHeight + BODY_HEIGHT_SLACK_PX}px`;
    return true;
  };

  const collapseBody = (body: HTMLElement, animated: boolean): void => {
    if (animated) {
      body.classList.add("is-collapsing");
      scope.setTimeout(
        () => body.classList.remove("is-collapsing"),
        COLLAPSE_TRANSITION_CLEANUP_MS,
      );
    }
    body.style.maxHeight = "0px";
  };

  const setOpen = (nextId: ProjectId | null): void => {
    const previousId = openCommitId;
    const isFullClose = nextId === null && previousId !== null;
    openCommitId = nextId;

    detailScope?.dispose();
    detailScope = null;

    for (const row of rows) {
      const id = commitIdOf(row);
      const isOpen = id === nextId;
      const body = requireElement(row, "[data-commit-body]");
      const toggle = requireElement<HTMLButtonElement>(row, "[data-commit-toggle]");

      row.classList.toggle("is-open", isOpen);
      // Everything that is not the open commit steps back rather than competing.
      row.classList.toggle("is-dimmed", nextId !== null && !isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.textContent = isOpen ? "close file" : "open file";

      if (!isOpen) {
        collapseBody(body, isFullClose && id === previousId);
        continue;
      }

      detailScope = new CleanupScope();
      scope.onDispose(() => detailScope?.dispose());

      // Claim the full height in ONE frame: the document's height changes once,
      // in the same frame the anchor starts, so the scrollbar thumb moves
      // monotonically instead of stuttering. The reveal is carried by the inner
      // content rising, not by the height growing.
      fitBody(body);

      const inner = findElement(body, "[data-commit-body-inner]");
      if (inner) {
        inner.classList.add("is-entering");
        forceStyleReflow(inner);
        inner.classList.remove("is-entering");
      }

      playCommitDetailSequence({
        row,
        project: projects[id],
        scope: detailScope,
        onContentGrew: () => fitBody(body),
      });

      requestAnimationFrame(() => fitBody(body));
    }
  };

  for (const row of rows) {
    const head = requireElement(row, "[data-commit-head]");
    const id = commitIdOf(row);

    scope.addEventListener(head, "click", () => {
      scrollAnchor?.abort();
      // Clicking during the draw finishes it immediately rather than queueing
      // behind it — the row has to be at its real height before it is measured.
      drawController.snapToFinalState();

      const previousId = openCommitId;
      const nextId = openCommitId === id ? null : id;
      const holdTop = head.getBoundingClientRect().top;

      setOpen(nextId);

      if (previousId !== null && previousId !== id) {
        // Switching: the outgoing body collapsed in the same layout pass and
        // displaced this row. Correct for it before the anchor takes over, so
        // the anchor has a still target rather than a moving one.
        const maximumScrollY = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        const corrected = window.scrollY + head.getBoundingClientRect().top - holdTop;
        window.scrollTo(0, Math.max(0, Math.min(maximumScrollY, corrected)));
      }

      scrollAnchor = holdElementInPlace(head, holdTop, ANCHOR_DURATION_MS, scope);
    });
  }

  // Any deliberate scroll hands control straight back to the reader.
  for (const eventName of ["wheel", "touchstart", "keydown"]) {
    scope.addEventListener(window, eventName, () => scrollAnchor?.abort(), { passive: true });
  }

  // A row that grows has to have its trunk dash re-cut: the trunk is a fixed
  // length dash, not a scaled box, so it does not follow its row on its own.
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) drawController.syncRowTrunk(entry.target as HTMLElement);
  });
  for (const row of rows) resizeObserver.observe(row);
  scope.onDispose(() => resizeObserver.disconnect());

  const refitOpenCommit: CleanupFunction = () => {
    if (openCommitId === null) return;
    const row = rows.find((candidate) => commitIdOf(candidate) === openCommitId);
    const body = row ? findElement(row, "[data-commit-body]") : null;
    if (body) fitBody(body);
  };

  scope.addEventListener(window, "resize", refitOpenCommit);

  // Script owns the collapsed state from here: the markup ships expanded so it
  // reads without JavaScript, and this is the moment it becomes an accordion.
  setOpen(null);

  return { refitOpenCommit };
}

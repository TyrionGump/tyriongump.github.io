import { CleanupScope } from "../../lib/cleanup-scope";
import { holdElementInPlace, type ScrollAnchor } from "../../lib/motion/hold-element-in-place";
import type { ProjectId } from "../../content/projects";
import { findAllElements, findElement, requireElement } from "../../lib/dom-queries";
import { forceStyleReflow } from "../../lib/dom-rendering";
import { playCommitDetailSequence, showCommitDetail } from "./commit-detail-sequence";
import type { GraphDrawController } from "./graph-draw-sequence";

/** Slack so a late reflow cannot clip the content. */
const BODY_HEIGHT_SLACK_PX = 48;
const ANCHOR_DURATION_MS = 1500;
/** Must outlast the CSS collapse transition. */
const COLLAPSE_TRANSITION_CLEANUP_MS = 500;

const commitIdOf = (row: HTMLElement): ProjectId => row.dataset["commit"] as ProjectId;

export interface CommitExpansionOptions {
  readonly initialOpenCommitId: ProjectId | null;
  readonly onOpenCommitChange: (id: ProjectId | null) => void;
}

export function mountCommitExpansion(
  graphRoot: HTMLElement,
  drawController: GraphDrawController,
  scope: CleanupScope,
  options: CommitExpansionOptions,
): void {
  const rows = findAllElements(graphRoot, "[data-commit]");
  let openCommitId: ProjectId | null = null;
  let scrollAnchor: ScrollAnchor | null = null;
  let detailScope: CleanupScope | null = null;
  scope.onDispose(() => detailScope?.dispose());

  /**
   * Returns false when the body cannot be measured. A body that is not laid out
   * reports 0, and writing that would collapse an open commit.
   */
  const fitBody = (body: HTMLElement): boolean => {
    if (!body.offsetParent) return false;

    // A closed row's detail sequence may still call this. Refitting it would
    // re-inflate a collapsed body and leave a tall empty gap.
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

  const setOpen = (nextId: ProjectId | null, animate: boolean): void => {
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
      row.classList.toggle("is-dimmed", nextId !== null && !isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.textContent = isOpen ? "close file" : "open file";

      if (!isOpen) {
        // A full close shrinks over time: dropping the height at once can clamp
        // the scroll position instantly, and that jump cannot be undone.
        collapseBody(body, isFullClose && id === previousId);
        continue;
      }

      detailScope = new CleanupScope();

      // Claim the full height in one frame, so the page height changes once as the
      // anchor starts. The reveal comes from the inner content rising, not the height.
      fitBody(body);
      requestAnimationFrame(() => fitBody(body));
      if (!animate) {
        showCommitDetail(row);
        continue;
      }

      const inner = findElement(body, "[data-commit-body-inner]");
      if (inner) {
        inner.classList.add("is-entering");
        forceStyleReflow(inner);
        inner.classList.remove("is-entering");
      }

      playCommitDetailSequence({
        row,
        scope: detailScope,
        onContentGrew: () => fitBody(body),
      });
    }
  };

  for (const row of rows) {
    const head = requireElement(row, "[data-commit-head]");
    const id = commitIdOf(row);

    scope.addEventListener(head, "click", () => {
      scrollAnchor?.abort();
      // Finish the draw first: the row must be at its real height before it is measured.
      drawController.snapToFinalState();

      const previousId = openCommitId;
      const nextId = openCommitId === id ? null : id;
      const holdTop = head.getBoundingClientRect().top;

      setOpen(nextId, true);
      options.onOpenCommitChange(nextId);

      if (previousId !== null && previousId !== id) {
        // Switching: the old body collapsed at once and moved this row. Correct for
        // it now, so the anchor starts from a still target.
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

  // Any scroll input from the reader stops the anchor.
  for (const eventName of ["wheel", "touchstart", "keydown"]) {
    scope.addEventListener(window, eventName, () => scrollAnchor?.abort(), { passive: true });
  }

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) drawController.syncRowTrunk(entry.target as HTMLElement);
  });
  for (const row of rows) resizeObserver.observe(row);
  scope.onDispose(() => resizeObserver.disconnect());

  const refitOpenCommit = (): void => {
    if (openCommitId === null) return;
    const row = rows.find((candidate) => commitIdOf(candidate) === openCommitId);
    const body = row ? findElement(row, "[data-commit-body]") : null;
    if (body) fitBody(body);
  };

  scope.addEventListener(window, "resize", refitOpenCommit);

  // The markup ships expanded so it reads without JavaScript. Collapse it now.
  setOpen(options.initialOpenCommitId, false);
}

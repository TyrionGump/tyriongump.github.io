/**
 * A small fixed ring in the bottom-right corner that fills as you scroll and
 * returns you to the top when clicked.
 *
 * The arc's circumference is baked into the markup as its dash array: with
 * `r=16` that is 2πr ≈ 100.53. It is exported rather than duplicated, because
 * `mount-scroll-progress-ring.ts` drives `stroke-dashoffset` from the same
 * number every frame and the two must agree exactly.
 *
 * Runs in Node at build time, so nothing here — or anything it imports — may touch the DOM.
 */

import { html, type HtmlFragment } from "../../shared/html-template";

/** 2π × 16, the radius used below. */
export const scrollRingCircumference = 100.53;

export function renderScrollProgressRing(): HtmlFragment {
  return html`
    <button
      class="scroll-progress-ring"
      data-scroll-ring
      type="button"
      title="Back to top"
      aria-label="Back to top"
    >
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
        <circle class="scroll-ring-track" cx="18" cy="18" r="16"></circle>
        <circle
          class="scroll-ring-arc"
          data-scroll-ring-arc
          cx="18"
          cy="18"
          r="16"
          stroke-dasharray="${scrollRingCircumference}"
          stroke-dashoffset="${scrollRingCircumference}"
        ></circle>
        <circle class="scroll-ring-dot" cx="18" cy="18" r="2.1"></circle>
      </svg>
    </button>
  `;
}

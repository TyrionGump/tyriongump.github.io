/**
 * Bridges the string-producing `render-*` modules into live DOM.
 *
 * This is the only place markup crosses from "a string built at build time" to
 * "an element on the page", which keeps the seam between the two easy to find.
 */

import { renderFragmentToMarkup, type HtmlFragment } from "./html-template";

/**
 * Throws unless the fragment produced exactly one root element. A fragment used
 * this way is a single component, and silently returning the last of several
 * would be a confusing bug to chase.
 */
export function appendFragment(parent: HTMLElement, fragment: HtmlFragment): HTMLElement {
  const template = document.createElement("template");
  template.innerHTML = renderFragmentToMarkup(fragment).trim();

  const [root, ...extras] = Array.from(template.content.children);
  if (!root || extras.length > 0) {
    throw new Error(
      `appendFragment expects a fragment with exactly one root element, got ${template.content.children.length}.`,
    );
  }

  parent.appendChild(root);
  return root as HTMLElement;
}

/**
 * Flushes pending style changes so the next one animates rather than being
 * batched into the same frame. Insert an element at one opacity and move it to
 * another without this, and the browser only ever sees the final value — the
 * transition never runs.
 */
export function forceStyleReflow(element: HTMLElement): void {
  void element.offsetWidth;
}

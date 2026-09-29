import { renderFragmentToMarkup, type HtmlFragment } from "./html-template";

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
 * Flushes pending styles. Without it, a style set right after insertion is batched
 * with the initial one and the transition never runs.
 */
export function forceStyleReflow(element: HTMLElement): void {
  void element.offsetWidth;
}

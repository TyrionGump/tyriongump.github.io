/**
 * Narrow DOM lookup helpers.
 *
 * `mount-*` modules attach behaviour to markup that was rendered elsewhere
 * (usually baked into `index.html` at build time), so every lookup is a place
 * where the two can drift. These helpers make that drift loud instead of silent:
 * `requireElement` throws with the selector that failed rather than returning
 * `null` and producing a confusing error three frames later.
 */

export function requireElement<TElement extends Element = HTMLElement>(
  container: ParentNode,
  selector: string,
): TElement {
  const element = container.querySelector<TElement>(selector);
  if (!element) {
    throw new Error(`Expected an element matching "${selector}" but found none.`);
  }
  return element;
}

export function findElement<TElement extends Element = HTMLElement>(
  container: ParentNode,
  selector: string,
): TElement | null {
  return container.querySelector<TElement>(selector);
}

export function findAllElements<TElement extends Element = HTMLElement>(
  container: ParentNode,
  selector: string,
): readonly TElement[] {
  return Array.from(container.querySelectorAll<TElement>(selector));
}

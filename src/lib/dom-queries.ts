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

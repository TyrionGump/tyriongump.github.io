import type { CleanupScope } from "../../lib/cleanup-scope";
import { findAllElements } from "../../lib/dom-queries";
import { navigateTo } from "../../lib/navigation";

const INTERACTIVE_ELEMENTS =
  'a[href], button, input, select, textarea, [contenteditable]:not([contenteditable="false"])';

export function activateHomeNavigationMenu(menu: HTMLElement, scope: CleanupScope): void {
  const options = findAllElements<HTMLAnchorElement>(menu, "[data-home-menu-option]");
  if (options.length === 0) return;

  let selectedIndex = 0;

  const paintSelection = (): void => {
    options.forEach((option, index) => {
      option.classList.toggle("is-selected", index === selectedIndex);
    });
  };

  options.forEach((option, index) => {
    scope.addEventListener(option, "mouseenter", () => {
      selectedIndex = index;
      paintSelection();
    });
    // Keep the highlight on the focused option when someone tabs through.
    scope.addEventListener(option, "focus", () => {
      selectedIndex = index;
      paintSelection();
    });
  });

  paintSelection();

  const isKeyForAnotherControl = (event: KeyboardEvent): boolean => {
    if (!(event.target instanceof Element)) return false;
    const control = event.target.closest(INTERACTIVE_ELEMENTS);
    return control !== null && !menu.contains(control);
  };

  // On window, so the keys work without a click into the page first.
  scope.addEventListener<KeyboardEvent>(window, "keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (isKeyForAnotherControl(event)) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : options.length - 1;
      selectedIndex = (selectedIndex + step) % options.length;
      paintSelection();
      return;
    }

    if (event.key === "Enter") {
      const selected = options[selectedIndex];
      if (!selected) return;
      event.preventDefault();
      navigateTo(selected.href);
    }
  });
}

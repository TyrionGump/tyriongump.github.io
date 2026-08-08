/**
 * Selection behaviour for the Home menu.
 *
 * The options are real anchors, so clicking, middle-clicking and tabbing all
 * work without any of this. What this adds is the shell affordance on top:
 * ↑/↓ move the highlight and Enter follows it, the way a real picker behaves.
 */

import type { CleanupScope } from "../../animation/cleanup-scope";
import { findAllElements } from "../../shared/dom-queries";

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
    // Keeps the highlight and the browser's own focus ring in agreement when
    // someone tabs through instead of using the arrow keys.
    scope.addEventListener(option, "focus", () => {
      selectedIndex = index;
      paintSelection();
    });
  });

  paintSelection();

  /**
   * The listener is on `window` so the keys work without the visitor having to
   * click into anything first — but the menu only owns the arrow keys while its
   * page is the one on screen.
   */
  const isMenuOnScreen = (): boolean =>
    menu.closest(".site-page")?.classList.contains("is-active") ?? false;

  scope.addEventListener<KeyboardEvent>(window, "keydown", (event) => {
    if (!isMenuOnScreen()) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

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
      window.location.hash = selected.hash;
    }
  });
}

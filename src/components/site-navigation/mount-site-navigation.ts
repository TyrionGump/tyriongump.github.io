/**
 * Behaviour for the sticky navigation.
 *
 * There is deliberately no click handling here. The links are real anchors
 * pointing at real hashes, so the browser navigates them natively and the back
 * button moves between pages. Intercepting clicks to call `history.replaceState`
 * would suppress history entirely.
 */

import { CleanupScope, type CleanupFunction } from "../../animation/cleanup-scope";
import type { RouteName } from "../../routing/route-names";
import { findAllElements } from "../../shared/dom-queries";

export interface SiteNavigationController {
  /** Highlights the link for the given route and clears the others. */
  setActiveRoute(route: RouteName): void;
  dispose: CleanupFunction;
}

export function mountSiteNavigation(navigationRoot: HTMLElement): SiteNavigationController {
  const scope = new CleanupScope();
  const routeLinks = findAllElements<HTMLAnchorElement>(navigationRoot, "[data-navigation-route]");

  return {
    setActiveRoute(route) {
      for (const link of routeLinks) {
        link.classList.toggle("is-active", link.dataset["navigationRoute"] === route);
      }
    },
    dispose: () => scope.dispose(),
  };
}

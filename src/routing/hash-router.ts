/**
 * Hash routing.
 *
 * There is no click interception here — the site's links are real anchors with
 * real hashes, so the browser handles navigation and history natively and this
 * only has to react to the result. That keeps the back button working, which
 * intercepting clicks would not.
 */

import type { CleanupFunction } from "../animation/cleanup-scope";
import { CleanupScope } from "../animation/cleanup-scope";
import { readRouteNameFromHash, type RouteName } from "./route-names";

export interface HashRouterOptions {
  /**
   * Called once immediately with the route the page loaded on (with
   * `previousRoute` null), and again on every subsequent change.
   */
  readonly onRouteChange: (route: RouteName, previousRoute: RouteName | null) => void;
}

export function startHashRouter(options: HashRouterOptions): CleanupFunction {
  const scope = new CleanupScope();
  let currentRoute: RouteName | null = null;

  const applyRouteFromLocation = (): void => {
    const nextRoute = readRouteNameFromHash(window.location.hash);
    if (nextRoute === currentRoute) return;

    const previousRoute = currentRoute;
    currentRoute = nextRoute;
    options.onRouteChange(nextRoute, previousRoute);
  };

  scope.addEventListener(window, "hashchange", applyRouteFromLocation);
  applyRouteFromLocation();

  return () => scope.dispose();
}

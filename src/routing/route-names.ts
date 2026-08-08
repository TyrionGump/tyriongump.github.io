/**
 * The site's three routes.
 *
 * Routing is hash-based (`#home`, `#work`, `#personal`). That is not a
 * compromise here — the site is deployed to GitHub Pages, which serves static
 * files with no rewrite rules, so hash routing avoids 404s on deep links
 * without needing a 404.html redirect trick.
 */

export const routeNames = ["home", "work", "personal"] as const;

export type RouteName = (typeof routeNames)[number];

export const defaultRouteName: RouteName = "home";

export function isRouteName(value: string): value is RouteName {
  return (routeNames as readonly string[]).includes(value);
}

/** Reads a route from a location hash, falling back to the default for anything unrecognised. */
export function readRouteNameFromHash(hash: string): RouteName {
  const candidate = hash.replace(/^#/, "");
  return isRouteName(candidate) ? candidate : defaultRouteName;
}

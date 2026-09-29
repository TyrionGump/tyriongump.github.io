import { defaultRouteName, isRouteName, type RouteName } from "../site-pages";

/** Reads a route from a location hash, falling back to Home for anything unrecognised. */
export function readRouteNameFromHash(hash: string): RouteName {
  const candidate = hash.replace(/^#/, "");
  return isRouteName(candidate) ? candidate : defaultRouteName;
}

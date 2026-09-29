/**
 * The site's pages. The navigation, the footers, the Home menu, the console and
 * the prerender slots are all built from this list, so a new page is one entry.
 */

export const sitePages = [
  { route: "home", label: "Home" },
  { route: "work", label: "Work" },
  { route: "personal", label: "Personal" },
] as const;

export type SitePage = (typeof sitePages)[number];
export type RouteName = SitePage["route"];

export const routeNames: readonly RouteName[] = sitePages.map((page) => page.route);

export const defaultRouteName: RouteName = "home";

export function isRouteName(value: string): value is RouteName {
  return (routeNames as readonly string[]).includes(value);
}

export function routeHref(route: RouteName): string {
  return `#${route}`;
}

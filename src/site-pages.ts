export const siteUrl = "https://tyriongump.github.io";

export const sitePages = [
  {
    route: "home",
    path: "/",
    label: "Home",
    title: "Andrew — Software Engineer",
    description:
      "Andrew builds software end to end — the database underneath, the API in the middle, and the screen you actually use. Melbourne, AU.",
  },
  {
    route: "work",
    path: "/work/",
    label: "Work",
    title: "Work — Andrew",
    description:
      "Payments infrastructure and fleet orchestration, told as a git log: the problem, what it took, and the code.",
  },
  {
    route: "personal",
    path: "/personal/",
    label: "Personal",
    title: "Personal — Andrew",
    description:
      "I started on backends and kept following problems until I’d touched every layer. Now, projects and contact.",
  },
] as const;

export type SitePage = (typeof sitePages)[number];
export type RouteName = SitePage["route"];

export const routeNames: readonly RouteName[] = sitePages.map((page) => page.route);

export const defaultRouteName: RouteName = "home";

export function isRouteName(value: string): value is RouteName {
  return (routeNames as readonly string[]).includes(value);
}

export function findSitePage(route: RouteName): SitePage {
  const page = sitePages.find((candidate) => candidate.route === route);
  if (!page) throw new Error(`"${route}" is not a page.`);
  return page;
}

export function routeHref(route: RouteName): string {
  return findSitePage(route).path;
}

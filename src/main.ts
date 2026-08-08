/**
 * Composition root.
 *
 * Everything the site does is wired here and nowhere else: which stylesheet
 * ships, which components mount, and what happens on a route change. Components
 * never reach for each other's *behaviour* — `mount-*` are wired only here. Their
 * `render-*` halves do compose freely, which is what pure functions are for: the
 * site footer is called straight from Work and Personal rather than assembled
 * here at runtime, because assembling it here would bypass the prerender.
 *
 * All page markup is already in the document, baked in by the prerender plugin —
 * at build time, and on every dev-server request. Nothing below renders content;
 * it only attaches behaviour.
 */

import "./styles/index.css";

import { mountConsoleOverlay } from "./components/console-overlay/mount-console-overlay";
import { mountHomeTerminalPanel } from "./components/home-terminal-panel/mount-home-terminal-panel";
import { mountScrollProgressRing } from "./components/scroll-progress-ring/mount-scroll-progress-ring";
import { mountSiteNavigation } from "./components/site-navigation/mount-site-navigation";
import { mountWorkGitGraph } from "./components/work-git-graph/mount-work-git-graph";
import { startHashRouter } from "./routing/hash-router";
import type { PageMounter } from "./routing/page-lifecycle";
import type { RouteName } from "./routing/route-names";
import { findAllElements, findElement, requireElement } from "./shared/dom-queries";

/**
 * How each route wakes up. A route with no entry here is static markup that
 * needs no behaviour — which is the correct state for a page until it earns
 * otherwise.
 */
const pageMounters: Partial<Record<RouteName, PageMounter>> = {
  home: (page) => ({
    dispose: mountHomeTerminalPanel(requireElement(page, "[data-home-terminal-panel]")),
  }),
  work: (page) => mountWorkGitGraph(page),
};

/**
 * Routes torn down and re-run on every visit. Everything else mounts once and
 * keeps its state — see `page-lifecycle.ts` for why Home is the odd one out.
 */
const replayOnEveryVisit: ReadonlySet<RouteName> = new Set<RouteName>(["home"]);

/**
 * Moves focus past the navigation. Kept here rather than in a component because
 * it is one global control pointed at another — exactly what this file is for.
 */
function wireSkipLink(): void {
  const skipLink = findElement(document, "[data-skip-to-content]");
  const mainContent = findElement(document, "main");
  if (!skipLink || !mainContent) return;

  skipLink.addEventListener("click", () => {
    mainContent.focus({ preventScroll: true });
    mainContent.scrollIntoView({ block: "start", behavior: "auto" });
  });
}

function startSite(): void {
  wireSkipLink();
  const navigation = mountSiteNavigation(requireElement(document, ".site-navigation"));

  // Global chrome: mounted once, alive on every route. The console must come
  // after the nav so its trigger there already exists to be bound.
  mountConsoleOverlay(requireElement(document, "[data-console-overlay]"));
  mountScrollProgressRing(requireElement(document, "[data-scroll-ring]"));

  const pages = findAllElements(document, "[data-page]");
  const mountedPages = new Map<RouteName, ReturnType<PageMounter>>();

  startHashRouter({
    onRouteChange(route, previousRoute) {
      if (previousRoute !== null && replayOnEveryVisit.has(previousRoute)) {
        mountedPages.get(previousRoute)?.dispose();
        mountedPages.delete(previousRoute);
      }

      let activePage: HTMLElement | null = null;
      for (const page of pages) {
        const isActive = page.dataset["page"] === route;
        page.classList.toggle("is-active", isActive);
        if (isActive) activePage = page;
      }

      navigation.setActiveRoute(route);

      // Only on a real navigation. Doing it on first paint would fight a
      // visitor who arrived at a deep link and had already been scrolled.
      if (previousRoute !== null) window.scrollTo(0, 0);

      if (!activePage) return;

      const alreadyMounted = mountedPages.get(route);
      if (alreadyMounted) {
        // Measuring only works now that the page is displayed again.
        alreadyMounted.onReturn?.();
        return;
      }

      const mount = pageMounters[route];
      if (mount) mountedPages.set(route, mount(activePage));
    },
  });
}

startSite();

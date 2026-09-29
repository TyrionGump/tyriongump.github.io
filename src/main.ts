import { mountConsoleOverlay } from "./chrome/console/mount-console-overlay";
import { mountPageTransitions } from "./chrome/page-transitions/mount-page-transitions";
import { mountScrollProgressRing } from "./chrome/scroll-ring/mount-scroll-progress-ring";
import type { CleanupFunction } from "./lib/cleanup-scope";
import { requireElement } from "./lib/dom-queries";
import { mountHomePage } from "./pages/home/mount-home-page";
import { mountWorkPage } from "./pages/work/mount-work-page";
import { isRouteName, type RouteName } from "./site-pages";

/** A page with no entry is static markup. */
const pageMounters: Partial<Record<RouteName, (main: HTMLElement) => CleanupFunction>> = {
  home: mountHomePage,
  work: mountWorkPage,
};

function mountCurrentPage(): CleanupFunction {
  const pageId = document.documentElement.dataset["page"] ?? "";
  const mount = isRouteName(pageId) ? pageMounters[pageId] : undefined;
  return mount ? mount(requireElement(document, "main")) : () => {};
}

const consoleOverlay = mountConsoleOverlay(requireElement(document, "[data-console-overlay]"));
mountScrollProgressRing(requireElement(document, "[data-scroll-ring]"));

let unmountCurrentPage = mountCurrentPage();
mountPageTransitions({
  beforeLeave: () => unmountCurrentPage(),
  afterEnter: () => {
    unmountCurrentPage = mountCurrentPage();
    consoleOverlay.syncTriggers();
  },
});

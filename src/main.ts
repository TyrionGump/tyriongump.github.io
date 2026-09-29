import "./styles/index.css";

import { mountConsoleOverlay } from "./chrome/console/mount-console-overlay";
import { mountScrollProgressRing } from "./chrome/scroll-ring/mount-scroll-progress-ring";
import { requireElement } from "./lib/dom-queries";
import { mountHomePage } from "./pages/home/mount-home-page";
import { mountWorkPage } from "./pages/work/mount-work-page";
import { isRouteName, type RouteName } from "./site-pages";

const pageMounters: Partial<Record<RouteName, (main: HTMLElement) => void>> = {
  home: mountHomePage,
  work: mountWorkPage,
};

mountConsoleOverlay(requireElement(document, "[data-console-overlay]"));
mountScrollProgressRing(requireElement(document, "[data-scroll-ring]"));

const pageId = document.documentElement.dataset["page"] ?? "";
if (isRouteName(pageId)) pageMounters[pageId]?.(requireElement(document, "main"));

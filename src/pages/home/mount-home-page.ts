import { CleanupScope, type CleanupFunction } from "../../lib/cleanup-scope";
import { prefersReducedMotion } from "../../lib/motion/motion-preference";
import { siteIdentity } from "../../content/site-identity";
import { findElement, requireElement } from "../../lib/dom-queries";
import { playHomeIntroSequence } from "./home-intro-sequence";
import { activateHomeNavigationMenu } from "./home-navigation-menu";

const CLOCK_TICK_INTERVAL_MS = 15_000;

function startPanelClock(panel: HTMLElement, scope: CleanupScope): void {
  const clock = findElement(panel, "[data-home-terminal-clock]");
  if (!clock) return;

  const formatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: siteIdentity.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const showCurrentTime = (): void => {
    clock.textContent = formatter.format(new Date());
  };

  showCurrentTime();
  scope.setInterval(showCurrentTime, CLOCK_TICK_INTERVAL_MS);
}

function startPanelFocusDimming(panel: HTMLElement, scope: CleanupScope): void {
  const setWindowFocused = (isFocused: boolean): void => {
    panel.classList.toggle("is-window-unfocused", !isFocused);
  };

  scope.addEventListener(window, "focus", () => setWindowFocused(true));
  scope.addEventListener(window, "blur", () => setWindowFocused(false));
  scope.addEventListener(document, "visibilitychange", () =>
    setWindowFocused(document.visibilityState !== "hidden"),
  );

  // Start bright: `document.hasFocus()` often reports false while the visitor is
  // looking at the page.
  setWindowFocused(true);
}

export function mountHomePage(main: HTMLElement): CleanupFunction {
  const scope = new CleanupScope();
  const dispose = (): void => scope.dispose();
  const panel = requireElement(main, "[data-home-terminal-panel]");

  startPanelClock(panel, scope);
  startPanelFocusDimming(panel, scope);

  const bakedTranscript = requireElement(panel, "[data-home-terminal-transcript]");

  if (prefersReducedMotion()) {
    activateHomeNavigationMenu(requireElement(bakedTranscript, "[data-home-terminal-menu]"), scope);
    return dispose;
  }

  // The baked copy stays in the layout to size the panel under the animated copy.
  // Hide it from assistive tech and the tab order.
  bakedTranscript.classList.add("is-sizing-replica");
  bakedTranscript.setAttribute("aria-hidden", "true");
  bakedTranscript.setAttribute("inert", "");

  const stage = document.createElement("div");
  stage.className = "home-terminal-transcript home-terminal-transcript-stage";
  requireElement(panel, "[data-home-terminal-body]").appendChild(stage);

  void playHomeIntroSequence(stage, scope).then((menu) => {
    activateHomeNavigationMenu(menu, scope);
  });

  return dispose;
}

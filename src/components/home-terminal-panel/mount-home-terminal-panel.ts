/**
 * Brings the Home terminal panel to life.
 *
 * The finished session is already in the document (baked in at build time). This
 * module does three things on top of it: runs the panel clock, dims the panel
 * when the window loses focus, and — when motion is welcome — replays the
 * session as if it were being typed.
 *
 * The replay does not replace the baked markup. It hides it and layers an
 * animated copy over it in the same grid cell, so the hidden copy goes on
 * sizing the panel while the visible one fills up. Nothing shifts, and there is
 * no hard-coded height to go stale at an awkward width.
 */

import { CleanupScope, type CleanupFunction } from "../../animation/cleanup-scope";
import { prefersReducedMotion } from "../../animation/motion-preference";
import { siteIdentity } from "../../content/site-identity";
import { findElement, requireElement } from "../../shared/dom-queries";
import { playHomeIntroSequence } from "./home-intro-sequence";
import { activateHomeNavigationMenu } from "./home-navigation-menu";

/** Ticking faster than this would be visible work for no visible change. */
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

/**
 * Real terminals dim their frame when the window loses focus. Reproducing that
 * is behaviour rather than ornament — it costs no space and adds nothing new to
 * the screen.
 */
function startPanelFocusDimming(panel: HTMLElement, scope: CleanupScope): void {
  const setWindowFocused = (isFocused: boolean): void => {
    panel.classList.toggle("is-window-unfocused", !isFocused);
  };

  scope.addEventListener(window, "focus", () => setWindowFocused(true));
  scope.addEventListener(window, "blur", () => setWindowFocused(false));
  scope.addEventListener(document, "visibilitychange", () =>
    setWindowFocused(document.visibilityState !== "hidden"),
  );

  // Seeded bright deliberately: `document.hasFocus()` reports false in plenty of
  // situations where the visitor is looking straight at the page, and starting
  // dim would make the dimmed state the one most people see first.
  setWindowFocused(true);
}

export function mountHomeTerminalPanel(panel: HTMLElement): CleanupFunction {
  const scope = new CleanupScope();
  const dispose = (): void => scope.dispose();

  startPanelClock(panel, scope);
  startPanelFocusDimming(panel, scope);

  const bakedTranscript = requireElement(panel, "[data-home-terminal-transcript]");

  if (prefersReducedMotion()) {
    // Nothing to replay — the session is already on screen in its final state.
    activateHomeNavigationMenu(requireElement(bakedTranscript, "[data-home-terminal-menu]"), scope);
    return dispose;
  }

  // Kept in the layout so it goes on sizing the panel, but taken out of the
  // accessibility tree and the tab order while the animated copy is on top.
  bakedTranscript.classList.add("is-sizing-replica");
  bakedTranscript.setAttribute("aria-hidden", "true");
  bakedTranscript.setAttribute("inert", "");

  const stage = document.createElement("div");
  stage.className = "home-terminal-transcript home-terminal-transcript-stage";
  requireElement(panel, ".home-terminal-body").appendChild(stage);

  scope.onDispose(() => {
    stage.remove();
    bakedTranscript.classList.remove("is-sizing-replica");
    bakedTranscript.removeAttribute("aria-hidden");
    bakedTranscript.removeAttribute("inert");
  });

  void playHomeIntroSequence(stage, scope).then((menu) => {
    activateHomeNavigationMenu(menu, scope);
  });

  return dispose;
}

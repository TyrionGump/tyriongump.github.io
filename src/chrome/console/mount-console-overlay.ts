import { CleanupScope, type CleanupFunction } from "../../lib/cleanup-scope";
import { navigateTo } from "../../lib/navigation";
import { routeHref, type RouteName } from "../../site-pages";
import { findAllElements, requireElement } from "../../lib/dom-queries";
import { appendFragment } from "../../lib/dom-rendering";
import { html, type HtmlFragment } from "../../lib/html-template";
import { readSessionValue, writeSessionValue } from "../../lib/session-store";
import { runConsoleCommand, type ConsoleCommandContext } from "./console-commands";
import { createConsoleVitals } from "./console-vitals";

const HISTORY_SESSION_KEY = "console-history";
const MAXIMUM_HISTORY_LENGTH = 50;

function readHistory(): readonly string[] {
  const stored = readSessionValue(HISTORY_SESSION_KEY);
  return Array.isArray(stored) ? stored.filter((entry) => typeof entry === "string") : [];
}

export interface ConsoleOverlayController {
  /** Call after new markup arrives, so its triggers show whether the console is open. */
  syncTriggers(): void;
  dispose: CleanupFunction;
}

export function mountConsoleOverlay(overlay: HTMLElement): ConsoleOverlayController {
  const scope = new CleanupScope();

  const body = requireElement(overlay, "[data-console-body]");
  const output = requireElement(overlay, "[data-console-output]");
  const typed = requireElement(overlay, "[data-console-typed]");
  const input = requireElement<HTMLInputElement>(overlay, "[data-console-input]");
  const lastCommand = requireElement(overlay, "[data-console-last]");

  const vitals = createConsoleVitals(
    {
      fps: requireElement(overlay, "[data-console-fps]"),
      heap: requireElement(overlay, "[data-console-heap]"),
      uptime: requireElement(overlay, "[data-console-uptime]"),
    },
    scope,
  );

  let isOpen = false;

  const syncTriggers = (): void => {
    for (const trigger of findAllElements(document, "[data-console-trigger]")) {
      trigger.classList.toggle("is-console-open", isOpen);
      trigger.setAttribute("aria-expanded", String(isOpen));
    }
  };
  let hasBooted = false;
  let history = readHistory();
  let elementToRestoreFocusTo: HTMLElement | null = null;

  const scrollToEnd = (): void => {
    body.scrollTop = body.scrollHeight;
  };

  const appendLines = (lines: readonly HtmlFragment[]): void => {
    for (const line of lines) appendFragment(output, line);
  };

  const setStatus = (text: string): void => {
    lastCommand.textContent = text;
  };

  const printBootBanner = (): void => {
    const [navigation] = performance.getEntriesByType("navigation");
    const loadMs = Math.round(
      navigation instanceof PerformanceNavigationTiming && navigation.duration
        ? navigation.duration
        : performance.now(),
    );
    appendLines([
      html`<div class="console-line is-dim">
        ${new Date().toDateString()} · loaded in ${loadMs}ms
      </div>`,
      html`<div class="console-line is-dim">
        type <span class="console-accent">help</span> for commands ·
        <span class="console-accent">esc</span> closes
      </div>`,
      html`<div class="console-gap"></div>`,
    ]);
    setStatus("ready");
  };

  const setOpen = (nextOpen: boolean): void => {
    if (nextOpen === isOpen) return;
    if (nextOpen) {
      const active = document.activeElement;
      elementToRestoreFocusTo =
        active instanceof HTMLElement && active !== document.body ? active : null;
    }
    isOpen = nextOpen;

    overlay.classList.toggle("is-open", isOpen);
    overlay.setAttribute("aria-hidden", String(!isOpen));
    // The closed overlay only slides off-screen. `inert` keeps its prompt out of the tab order.
    overlay.toggleAttribute("inert", !isOpen);

    syncTriggers();

    if (!isOpen) {
      vitals.stop();
      input.blur();
      elementToRestoreFocusTo?.focus({ preventScroll: true });
      elementToRestoreFocusTo = null;
      return;
    }

    if (!hasBooted) {
      hasBooted = true;
      printBootBanner();
    }
    vitals.start();
    // Without `preventScroll`, focusing the fixed overlay can scroll the page back to the top.
    input.focus({ preventScroll: true });
    scrollToEnd();
  };

  const commandContext: ConsoleCommandContext = {
    clearOutput: () => {
      output.replaceChildren();
    },
    closeConsole: () => setOpen(false),
    navigateTo: (route: RouteName) => {
      setStatus(`route → ${route}`);
      navigateTo(routeHref(route));
      setOpen(false);
    },
    openExternalUrl: (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  };

  const appendCommand = (raw: string, context: ConsoleCommandContext): void => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    appendFragment(
      output,
      html`<div class="console-line is-echo">
        <span class="terminal-prompt-glyph">❯</span
        ><span class="console-echo-text">${trimmed}</span>
      </div>`,
    );
    appendLines(runConsoleCommand(trimmed, context));
    appendFragment(output, html`<div class="console-gap"></div>`);
    setStatus(`exec ${trimmed}`);
  };

  const submit = (): void => {
    const raw = input.value;
    if (raw.trim()) {
      history = [...history, raw.trim()].slice(-MAXIMUM_HISTORY_LENGTH);
      writeSessionValue(HISTORY_SESSION_KEY, history);
    }
    appendCommand(raw, commandContext);
    input.value = "";
    typed.textContent = "";
    scrollToEnd();
  };

  // Replay history with side effects stubbed out, so no command navigates or opens a tab twice.
  if (history.length > 0) {
    const replayContext: ConsoleCommandContext = {
      ...commandContext,
      closeConsole: () => {},
      navigateTo: () => {},
      openExternalUrl: () => {},
    };
    hasBooted = true;
    printBootBanner();
    for (const command of history) appendCommand(command, replayContext);
  }

  scope.addEventListener(input, "input", () => {
    typed.textContent = input.value;
  });

  scope.addEventListener<KeyboardEvent>(input, "keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  });

  // Backtick only opens, never toggles. Ignore it while the visitor types in a field.
  scope.addEventListener<KeyboardEvent>(window, "keydown", (event) => {
    if (event.key !== "`" && event.key !== "~") return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, [contenteditable="true"]')) return;

    event.preventDefault();
    setOpen(true);
  });

  // Delegated, so triggers that arrive with a new page work too.
  scope.addEventListener(document, "click", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest("[data-console-trigger]"))
      return;
    event.preventDefault();
    setOpen(!isOpen);
  });

  scope.addEventListener(body, "click", (event) => {
    if (!isOpen) return;
    if ((event.target as HTMLElement | null)?.closest("a")) return;
    if ((window.getSelection()?.toString().length ?? 0) > 0) return;
    input.focus({ preventScroll: true });
  });

  syncTriggers();
  return { syncTriggers, dispose: () => scope.dispose() };
}

/**
 * Wires up the console overlay.
 *
 * Opening: the backtick key from anywhere, or any `[data-console-trigger]` —
 * the nav's ❯ button and the word "terminal" in the Personal bio.
 * Closing: Escape, the trigger again, or `exit` / `q` / `close`.
 *
 * Backtick only ever opens — it does not toggle, or you could never type one
 * into the prompt. Predictable beats clever for a key you press by feel.
 */

import { CleanupScope, type CleanupFunction } from "../../lib/cleanup-scope";
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

export function mountConsoleOverlay(overlay: HTMLElement): CleanupFunction {
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
  let hasBooted = false;
  let history = readHistory();
  /** Where focus came from, so closing puts it back rather than dropping it on <body>. */
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

  /** The banner a real shell prints when it starts, using real numbers. */
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
    // The overlay only slides out of view, so it stays in the document while
    // closed. Without `inert` its prompt is still in the tab order and a
    // keyboard visitor lands in an invisible text field.
    overlay.toggleAttribute("inert", !isOpen);

    for (const trigger of findAllElements(document, "[data-console-trigger]")) {
      trigger.classList.toggle("is-console-open", isOpen);
      trigger.setAttribute("aria-expanded", String(isOpen));
    }

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
    // `preventScroll` matters: the overlay is fixed at the top of the viewport,
    // and focusing without it can yank a scrolled page back to the top.
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
      window.location.assign(routeHref(route));
      setOpen(false);
    },
    openExternalUrl: (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  };

  const appendCommand = (raw: string, context: ConsoleCommandContext): void => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    // Echoed even when it is not understood: a shell shows you what it heard.
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

  // A new page load rebuilds the transcript by running the history again. Only
  // `clear` has an effect, so no command navigates or opens a tab twice.
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

  // Backtick opens from anywhere — unless the visitor is typing into something,
  // in which case they meant to type a backtick.
  scope.addEventListener<KeyboardEvent>(window, "keydown", (event) => {
    if (event.key !== "`" && event.key !== "~") return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, [contenteditable="true"]')) return;

    event.preventDefault();
    setOpen(true);
  });

  for (const trigger of findAllElements(document, "[data-console-trigger]")) {
    trigger.setAttribute("aria-expanded", "false");
    scope.addEventListener(trigger, "click", (event) => {
      event.preventDefault();
      setOpen(!isOpen);
    });
  }

  // Clicking anywhere in the body puts the cursor back in the prompt, the way a
  // terminal window does — but never while text is being selected, or on a link.
  scope.addEventListener(body, "click", (event) => {
    if (!isOpen) return;
    if ((event.target as HTMLElement | null)?.closest("a")) return;
    if ((window.getSelection()?.toString().length ?? 0) > 0) return;
    input.focus({ preventScroll: true });
  });

  return () => scope.dispose();
}

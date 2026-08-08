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

import { CleanupScope, type CleanupFunction } from "../../animation/cleanup-scope";
import type { RouteName } from "../../routing/route-names";
import { findAllElements, findElement, requireElement } from "../../shared/dom-queries";
import { appendFragment } from "../../shared/dom-rendering";
import { html, type HtmlFragment } from "../../shared/html-template";
import { runConsoleCommand, type ConsoleCommandContext } from "./console-commands";
import { createConsoleVitals } from "./console-vitals";

export function mountConsoleOverlay(overlay: HTMLElement): CleanupFunction {
  const scope = new CleanupScope();

  const body = requireElement(overlay, "[data-console-body]");
  const output = requireElement(overlay, "[data-console-output]");
  const typed = requireElement(overlay, "[data-console-typed]");
  const input = requireElement<HTMLInputElement>(overlay, "[data-console-input]");
  const lastCommand = findElement(overlay, "[data-console-last]");

  const vitals = createConsoleVitals(
    {
      fps: findElement(overlay, "[data-console-fps]"),
      heap: findElement(overlay, "[data-console-heap]"),
      uptime: findElement(overlay, "[data-console-uptime]"),
    },
    scope,
  );

  let isOpen = false;
  let hasBooted = false;
  /** Where focus came from, so closing puts it back rather than dropping it on <body>. */
  let elementToRestoreFocusTo: HTMLElement | null = null;

  const scrollToEnd = (): void => {
    body.scrollTop = body.scrollHeight;
  };

  const appendLines = (lines: readonly HtmlFragment[]): void => {
    for (const line of lines) appendFragment(output, line);
  };

  const setStatus = (text: string): void => {
    if (lastCommand) lastCommand.textContent = text;
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
      window.location.hash = `#${route}`;
      setOpen(false);
    },
    openExternalUrl: (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  };

  const submit = (): void => {
    const raw = input.value;
    const trimmed = raw.trim();

    // The command is echoed even when it is not understood — a shell shows you
    // what it heard.
    if (trimmed) {
      appendFragment(
        output,
        html`<div class="console-line is-echo">
          <span class="terminal-prompt-glyph">❯</span
          ><span class="console-echo-text">${trimmed}</span>
        </div>`,
      );
    }

    appendLines(runConsoleCommand(raw, commandContext));
    if (trimmed) {
      appendFragment(output, html`<div class="console-gap"></div>`);
      setStatus(`exec ${trimmed}`);
    }

    input.value = "";
    typed.textContent = "";
    scrollToEnd();
  };

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

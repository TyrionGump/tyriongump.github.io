/**
 * The console overlay: a shell that slides down from the top edge on backtick,
 * from anywhere on the site.
 *
 * Unlike the rest of the site this ships empty — there is nothing to prerender,
 * because a console with no session yet has no content. It is also the one place
 * that genuinely needs JavaScript to mean anything, so nothing is lost by it
 * being blank without.
 *
 * The prompt is a real `<input>` behind a fake caret, not a keystroke listener
 * on `window` keeping its own buffer. That approach loses paste, IME
 * composition, text selection and the on-screen keyboard on a phone; a real
 * input costs one `input` listener to mirror its value and gets all of it free.
 *
 * Runs in Node at build time, so nothing here — or anything it imports — may touch the DOM.
 */

import { html, type HtmlFragment } from "../../shared/html-template";

export function renderConsoleOverlay(): HtmlFragment {
  // Two attributes below carry more weight than they look like they do:
  //
  //   inert     — the overlay ships closed but stays in the document, only
  //               translated off-screen. Without this its prompt is still in the
  //               tab order and a keyboard visitor lands in an invisible field.
  //   role=log  — the correct role for a transcript that grows at the bottom,
  //               and what makes the shell's answers reach a screen reader.
  //               Without it you type a command and hear nothing back, which is
  //               the entire interaction gone.
  return html`
    <div class="console-overlay" data-console-overlay aria-hidden="true" inert>
      <div class="console-body terminal-selection" data-console-body>
        <div class="console-output" data-console-output role="log" aria-live="polite"></div>
        <div class="console-prompt">
          <span class="terminal-prompt-glyph">❯</span>
          <span class="console-typed" data-console-typed></span>
          <span class="caret" aria-hidden="true"></span>
          <input
            class="console-input"
            data-console-input
            type="text"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            aria-label="Console command"
          />
        </div>
      </div>

      <div class="console-status-bar">
        <div class="console-chip">console</div>
        <div class="console-last-command" data-console-last></div>
        <div class="console-status-cells">
          <div class="console-status-cell">
            <span class="console-status-label">fps</span>
            <span class="console-status-value is-accent" data-console-fps>—</span>
          </div>
          <div class="console-status-cell">
            <span class="console-status-label">heap</span>
            <span class="console-status-value" data-console-heap>—</span>
          </div>
          <div class="console-status-cell is-uptime">
            <span data-console-uptime>00:00</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

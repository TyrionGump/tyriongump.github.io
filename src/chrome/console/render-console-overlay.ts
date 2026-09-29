// Runs in Node at build time, so nothing here or in its imports may touch the DOM.

import { html, type HtmlFragment } from "../../lib/html-template";

export function renderConsoleOverlay(): HtmlFragment {
  // The prompt is a real <input> behind a fake caret, so paste, IME and phone keyboards work.
  // `inert` keeps the off-screen prompt out of the tab order; `role=log` reads replies aloud.
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

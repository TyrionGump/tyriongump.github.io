/**
 * The Home page: a shell window that types `whoami` and answers itself.
 *
 * These functions render the session's **finished** state. That matters twice
 * over:
 *
 *  1. It is what ships in the served HTML — so the page says who this is even
 *     with JavaScript off, and search engines read prose rather than an empty
 *     div. It is also what a visitor with `prefers-reduced-motion` sees.
 *  2. It stays in the layout as a hidden replica while the animated copy plays
 *     on top of it, which sizes the panel correctly from the first frame. No
 *     hard-coded panel height to go stale at odd widths, and nothing shifts as
 *     content types in.
 *
 * The intro sequence reuses the same granular renderers below to build its
 * animated copy, so the two can never disagree about what the session says.
 *
 * Runs in Node at build time, so nothing here — or anything it imports — may touch the DOM.
 */

import {
  homeIntroCommand,
  homeIntroOutput,
  homeMenuCommand,
  homeMenuItems,
  homeMenuPrompt,
  type TerminalOutputLine,
} from "../../content/home-page-content";
import { html, type HtmlFragment } from "../../shared/html-template";

/** A prompt line with its command already typed out. */
export function renderHomeCommandLine(
  command: string,
  options?: { readonly isFollowUp?: boolean },
): HtmlFragment {
  const followUpClass = options?.isFollowUp ? " home-terminal-command-line-follow-up" : "";
  return html`
    <div class="home-terminal-command-line${followUpClass}">
      <span class="terminal-prompt-glyph">❯</span>
      <span class="home-terminal-command" data-home-terminal-command>${command}</span>
    </div>
  `;
}

function renderOutputLine(line: TerminalOutputLine): HtmlFragment {
  if (line.kind === "blank-line") {
    return html`<div class="home-terminal-blank-line" aria-hidden="true"></div>`;
  }
  // The greeting is this page's heading — Home has no other one, and a document
  // whose landing page has no h1 is a document with no title as far as assistive
  // tech is concerned. It stays styled as a terminal line.
  if (line.role === "greeting") {
    return html`<h1 class="home-terminal-line home-terminal-line-greeting">${line.text}</h1>`;
  }
  return html`<div class="home-terminal-line home-terminal-line-${line.role}">${line.text}</div>`;
}

/** `whoami`'s answer, as one block — a shell returns its output in one beat. */
export function renderHomeIntroOutput(): HtmlFragment {
  return html` <div class="home-terminal-output">${homeIntroOutput.map(renderOutputLine)}</div> `;
}

/**
 * The two-door menu. A menu waits for you in a way ghost text never does, and
 * `open` with no argument is a real shell pattern rather than an invented one.
 */
export function renderHomeNavigationMenu(): HtmlFragment {
  return html`
    <div class="home-terminal-menu" data-home-terminal-menu>
      <div class="home-terminal-menu-question">
        <span>
          <span class="home-terminal-menu-connector" aria-hidden="true">└</span>
          <span class="terminal-prompt-glyph">?</span>
          <span class="home-terminal-menu-question-text">${homeMenuPrompt}</span>
        </span>
        <span class="home-terminal-menu-hint">↑↓ · enter</span>
      </div>
      <ul class="home-terminal-menu-options">
        ${homeMenuItems.map(
          (item) => html`
            <li>
              <a
                class="home-terminal-menu-option"
                href="#${item.route}"
                data-home-menu-option="${item.route}"
              >
                <span class="home-terminal-menu-marker" aria-hidden="true"></span>
                <span class="home-terminal-menu-label">${item.label}</span>
                <span class="home-terminal-menu-description">${item.description}</span>
              </a>
            </li>
          `,
        )}
      </ul>
    </div>
  `;
}

/** The finished session: both commands, the output, and the menu. */
export function renderHomeTranscript(): HtmlFragment {
  return html`
    <div class="home-terminal-transcript" data-home-terminal-transcript>
      ${renderHomeCommandLine(homeIntroCommand)} ${renderHomeIntroOutput()}
      ${renderHomeCommandLine(homeMenuCommand, { isFollowUp: true })} ${renderHomeNavigationMenu()}
    </div>
  `;
}

export function renderHomePage(): HtmlFragment {
  return html`
    <div class="home-page-frame site-column-wide site-viewport-fill">
      <section class="home-terminal-panel" data-home-terminal-panel aria-label="Introduction">
        <header class="home-terminal-title-bar">
          <div class="home-terminal-location">
            ~<span class="home-terminal-title-separator" aria-hidden="true">—</span><span>zsh</span>
          </div>
          <span class="home-terminal-clock" data-home-terminal-clock>--:--</span>
        </header>
        <div class="home-terminal-body terminal-selection">${renderHomeTranscript()}</div>
      </section>
    </div>
  `;
}

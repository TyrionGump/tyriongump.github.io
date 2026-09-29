// Runs in Node at build time, so nothing here or in its imports may touch the DOM.

import {
  homeIntroCommand,
  homeIntroOutput,
  homeMenuCommand,
  homeMenuDescriptions,
  homeMenuPrompt,
  type TerminalOutputLine,
} from "../../content/home-page-content";
import { html, type HtmlFragment } from "../../lib/html-template";
import { routeHref, routeNames } from "../../site-pages";

type MenuRoute = keyof typeof homeMenuDescriptions;

const menuRoutes = routeNames.filter((route): route is MenuRoute => route in homeMenuDescriptions);

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
  // The greeting is Home's only h1, so assistive tech gets a page title.
  if (line.role === "greeting") {
    return html`<h1 class="home-terminal-line home-terminal-line-greeting">${line.text}</h1>`;
  }
  return html`<div class="home-terminal-line home-terminal-line-${line.role}">${line.text}</div>`;
}

export function renderHomeIntroOutput(): HtmlFragment {
  return html` <div class="home-terminal-output">${homeIntroOutput.map(renderOutputLine)}</div> `;
}

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
        ${menuRoutes.map(
          (route) => html`
            <li>
              <a
                class="home-terminal-menu-option"
                href="${routeHref(route)}"
                data-home-menu-option="${route}"
              >
                <span class="home-terminal-menu-marker" aria-hidden="true"></span>
                <span class="home-terminal-menu-label">${route}</span>
                <span class="home-terminal-menu-description">${homeMenuDescriptions[route]}</span>
              </a>
            </li>
          `,
        )}
      </ul>
    </div>
  `;
}

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
        <div class="home-terminal-body terminal-selection" data-home-terminal-body>
          ${renderHomeTranscript()}
        </div>
      </section>
    </div>
  `;
}

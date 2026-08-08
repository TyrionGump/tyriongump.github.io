/**
 * The sticky top navigation. Present on every route.
 *
 * Pure markup — no DOM access — so this runs at build time and the nav ships in
 * the served HTML rather than being drawn by script.
 */

import { siteIdentity } from "../../content/site-identity";
import { html, type HtmlFragment } from "../../shared/html-template";

export function renderSiteNavigation(): HtmlFragment {
  return html`
    <header class="site-navigation">
      <nav class="site-navigation-frame" aria-label="Primary">
        <a class="site-navigation-wordmark" href="#home">
          <span class="site-navigation-status-dot" aria-hidden="true"></span>${siteIdentity.handle}
        </a>
        <div class="site-navigation-links">
          <a class="site-navigation-link" href="#work" data-navigation-route="work">Work</a>
          <a class="site-navigation-link" href="#personal" data-navigation-route="personal"
            >Personal</a
          >
          <a
            class="site-navigation-link site-navigation-link-mono"
            href="${siteIdentity.githubUrl}"
            target="_blank"
            rel="noreferrer noopener"
            >GitHub ↗</a
          >
          <button
            class="site-navigation-console-button"
            type="button"
            data-console-trigger
            title="Console — press \`"
            aria-label="Open console"
          >
            ❯
          </button>
        </div>
      </nav>
    </header>
  `;
}

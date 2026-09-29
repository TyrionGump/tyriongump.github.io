/**
 * The sticky top navigation. Present on every route.
 *
 * Pure markup — no DOM access — so this runs at build time and the nav ships in
 * the served HTML rather than being drawn by script.
 */

import { siteIdentity } from "../../content/site-identity";
import { html, type HtmlFragment } from "../../lib/html-template";
import { defaultRouteName, routeHref, sitePages } from "../../site-pages";

export function renderSiteNavigation(): HtmlFragment {
  return html`
    <header class="site-navigation">
      <nav class="site-navigation-frame" aria-label="Primary">
        <a class="site-navigation-logo" href="${routeHref(defaultRouteName)}">
          <span class="site-navigation-status-dot" aria-hidden="true"></span>${siteIdentity.handle}
        </a>
        <div class="site-navigation-links">
          ${sitePages
            .filter((page) => page.route !== defaultRouteName)
            .map(
              (page) =>
                html`<a
                  class="site-navigation-link"
                  href="${routeHref(page.route)}"
                  data-navigation-route="${page.route}"
                  >${page.label}</a
                >`,
            )}
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

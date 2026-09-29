import { siteIdentity } from "../../content/site-identity";
import { html, type HtmlFragment } from "../../lib/html-template";
import { defaultRouteName, routeHref, sitePages, type RouteName } from "../../site-pages";

/** `currentRoute` is null on pages outside the route list, such as the 404 page. */
export function renderSiteNavigation(currentRoute: RouteName | null): HtmlFragment {
  return html`
    <header class="site-navigation" data-site-navigation>
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
                  aria-current="${page.route === currentRoute ? "page" : "false"}"
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

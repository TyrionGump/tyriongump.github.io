import { html, type HtmlFragment } from "../../lib/html-template";
import { routeHref, sitePages, type RouteName } from "../../site-pages";

export function renderSiteFooter(destination: RouteName): HtmlFragment {
  const page = sitePages.find((candidate) => candidate.route === destination);
  if (!page) throw new Error(`renderSiteFooter: "${destination}" is not a route.`);
  return html`
    <footer class="site-footer">
      <a class="site-footer-link" href="${routeHref(page.route)}">${page.label} →</a>
    </footer>
  `;
}

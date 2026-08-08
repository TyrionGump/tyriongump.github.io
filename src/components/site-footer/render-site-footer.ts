/**
 * The footer that closes every interior page and hands off to the next one.
 *
 * The design offers four footer styles; only the hairline is built. The other
 * three are alternates it already chose between, and carrying them unused would
 * be dead code.
 *
 * Runs in Node at build time, so nothing here — or anything it imports — may touch the DOM.
 */

import { routeNames, type RouteName } from "../../routing/route-names";
import { html, type HtmlFragment } from "../../shared/html-template";

const routeLabels: Readonly<Record<RouteName, string>> = {
  home: "Home",
  work: "Work",
  personal: "Personal",
};

export function renderSiteFooter(destination: RouteName): HtmlFragment {
  if (!routeNames.includes(destination)) {
    throw new Error(`renderSiteFooter: "${destination}" is not a route.`);
  }
  return html`
    <footer class="site-footer">
      <a class="site-footer-link" href="#${destination}">${routeLabels[destination]} →</a>
    </footer>
  `;
}

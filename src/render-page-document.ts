import { renderConsoleOverlay } from "./chrome/console/render-console-overlay";
import { renderSiteNavigation } from "./chrome/navigation/render-site-navigation";
import { renderScrollProgressRing } from "./chrome/scroll-ring/render-scroll-progress-ring";
import { html, unsafeTrustedHtml, type HtmlFragment } from "./lib/html-template";
import { renderHomePage } from "./pages/home/render-home-page";
import { renderNotFoundPage } from "./pages/not-found/render-not-found-page";
import { renderPersonalPage } from "./pages/personal/render-personal-page";
import { renderWorkPage } from "./pages/work/render-work-page";
import {
  defaultRouteName,
  findSitePage,
  isRouteName,
  sitePages,
  siteUrl,
  type RouteName,
} from "./site-pages";

export const notFoundPageId = "not-found";

const pageRenderers: Readonly<Record<RouteName, () => HtmlFragment>> = {
  home: renderHomePage,
  work: renderWorkPage,
  personal: renderPersonalPage,
};

function routeOf(pageId: string): RouteName | null {
  if (isRouteName(pageId)) return pageId;
  if (pageId === notFoundPageId) return null;
  throw new Error(`"${pageId}" is neither a route in site-pages.ts nor "${notFoundPageId}".`);
}

/** Old links used `/#work`. The server sends them to Home, so Home sends them on. */
function renderHashLinkRedirect(): HtmlFragment {
  const pathByHash = Object.fromEntries(sitePages.map((page) => [`#${page.route}`, page.path]));
  return html`<script>
    const path = ${unsafeTrustedHtml(JSON.stringify(pathByHash))}[location.hash];
    if (path) location.replace(path);
  </script>`;
}

function renderSharingTags(title: string, description: string, url: string): HtmlFragment {
  return html`
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta name="twitter:card" content="summary" />
  `;
}

export function renderPageHead(pageId: string): HtmlFragment {
  const route = routeOf(pageId);
  const page = route ? findSitePage(route) : null;

  return html`
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${page?.title ?? "Not found — Andrew"}</title>
    ${
      page
        ? html`
            <meta name="description" content="${page.description}" />
            ${renderSharingTags(page.title, page.description, siteUrl + page.path)}
          `
        : html`<meta name="robots" content="noindex" />`
    }
    ${route === defaultRouteName ? renderHashLinkRedirect() : null}
    <!-- Lets CSS hide what script animates in, so nothing shows and then hides. -->
    <script>
      document.documentElement.classList.add("js-enabled");
    </script>
    <!-- crossorigin is required: fonts always load in CORS mode, and a mismatched preload is fetched twice. -->
    <link rel="stylesheet" href="/src/styles/index.css" />
    <link
      rel="preload"
      as="font"
      type="font/woff2"
      href="/fonts/manrope-variable-latin.woff2"
      crossorigin
    />
    <link
      rel="preload"
      as="font"
      type="font/woff2"
      href="/fonts/jetbrains-mono-variable-latin.woff2"
      crossorigin
    />
  `;
}

export function renderPageBody(pageId: string): HtmlFragment {
  const route = routeOf(pageId);
  const page = route ? pageRenderers[route]() : renderNotFoundPage();

  return html`
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="site-shell">
      ${renderSiteNavigation(route)}
      <main class="site-page" id="main" tabindex="-1">${page}</main>
    </div>
    <!-- Outside .site-shell: its overflow clip can also clip fixed descendants. -->
    ${renderConsoleOverlay()} ${renderScrollProgressRing()}
  `;
}

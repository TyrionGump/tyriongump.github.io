import { renderSiteFooter } from "../../chrome/footer/render-site-footer";
import { html, type HtmlFragment } from "../../lib/html-template";

export function renderNotFoundPage(): HtmlFragment {
  return html`
    <div class="not-found-page-frame site-column site-viewport-fill">
      <div class="not-found-line terminal-gutter-row">
        <div class="terminal-prompt-glyph">❯</div>
        <h1 class="not-found-message">zsh: no such page</h1>
      </div>
      <div class="not-found-footer">${renderSiteFooter("home")}</div>
    </div>
  `;
}

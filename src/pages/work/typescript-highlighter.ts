// Runs only at build time, in the prerender step. Shiki must never reach the browser bundle.

import { createHighlighterCoreSync, type ThemeRegistration } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import typescript from "shiki/langs/typescript.mjs";

import { html, type HtmlFragment } from "../../lib/html-template";

// Each colour is a CSS variable, so work-page.css keeps control of the palette.
const tokenColor = (name: string): string => `var(--code-token-${name})`;

const siteTheme: ThemeRegistration = {
  name: "site",
  type: "dark",
  fg: tokenColor("text"),
  bg: "transparent",
  settings: [
    { settings: { foreground: tokenColor("text") } },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: tokenColor("comment") },
    },
    {
      scope: ["string", "punctuation.definition.string"],
      settings: { foreground: tokenColor("string") },
    },
    { scope: ["keyword", "storage"], settings: { foreground: tokenColor("keyword") } },
    {
      scope: ["constant.numeric", "constant.language"],
      settings: { foreground: tokenColor("literal") },
    },
    {
      scope: ["entity.name.type", "entity.name.class", "support.type", "support.class"],
      settings: { foreground: tokenColor("type") },
    },
    {
      scope: ["entity.name.function", "support.function"],
      settings: { foreground: tokenColor("function") },
    },
    {
      scope: ["meta.object-literal.key", "variable.other.property", "support.variable.property"],
      settings: { foreground: tokenColor("property") },
    },
    {
      scope: ["punctuation", "keyword.operator", "meta.brace"],
      settings: { foreground: tokenColor("punctuation") },
    },
  ],
};

const highlighter = createHighlighterCoreSync({
  themes: [siteTheme],
  langs: [typescript],
  engine: createJavaScriptRegexEngine(),
});

/** One fragment per line, so the viewer can number and reveal lines one at a time. */
export function highlightTypeScript(code: string): readonly HtmlFragment[] {
  return highlighter.codeToTokensBase(code, { lang: "typescript", theme: "site" }).map((tokens) =>
    tokens.length === 0
      ? // Keeps a blank line one row tall in the viewer's line grid.
        html`${" "}`
      : html`${tokens.map((token) => html`<span style="color:${token.color}">${token.content}</span>`)}`,
  );
}

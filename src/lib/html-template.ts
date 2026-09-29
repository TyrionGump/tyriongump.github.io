/**
 * A tiny, escaping-by-default HTML template helper.
 *
 * `render-*` modules use this to produce markup as plain strings so they can run
 * both at build time (in Node, to bake content into `index.html`) and in the
 * browser. They must never touch the DOM.
 *
 * Interpolated values are HTML-escaped unless they are themselves `HtmlFragment`
 * values, which lets fragments nest without double-escaping:
 *
 *   const badge = html`<em>${userSuppliedText}</em>`   // escaped
 *   const row   = html`<li>${badge}</li>`              // inserted verbatim
 */

const HTML_FRAGMENT_MARKER = Symbol("HtmlFragment");

export interface HtmlFragment {
  readonly [HTML_FRAGMENT_MARKER]: true;
  readonly markup: string;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createFragment(markup: string): HtmlFragment {
  return { [HTML_FRAGMENT_MARKER]: true, markup };
}

function isHtmlFragment(value: unknown): value is HtmlFragment {
  return typeof value === "object" && value !== null && HTML_FRAGMENT_MARKER in value;
}

/**
 * Wraps markup that is already trusted (hand-authored constants, never user
 * input) so `html` will insert it verbatim. The name is deliberately alarming:
 * every call site should be obvious when reading a diff.
 */
export function unsafeTrustedHtml(markup: string): HtmlFragment {
  return createFragment(markup);
}

type Interpolated =
  | HtmlFragment
  | string
  | number
  | readonly Interpolated[]
  | null
  | undefined
  | false;

function stringifyValue(value: Interpolated): string {
  if (value === null || value === undefined || value === false) return "";
  if (isHtmlFragment(value)) return value.markup;
  if (Array.isArray(value)) return value.map(stringifyValue).join("");
  return escapeHtml(String(value));
}

export function html(
  strings: TemplateStringsArray,
  ...values: readonly Interpolated[]
): HtmlFragment {
  let markup = strings[0] ?? "";
  for (let index = 0; index < values.length; index += 1) {
    markup += stringifyValue(values[index] as Interpolated) + (strings[index + 1] ?? "");
  }
  return createFragment(markup);
}

export function renderFragmentToMarkup(fragment: HtmlFragment): string {
  return fragment.markup;
}

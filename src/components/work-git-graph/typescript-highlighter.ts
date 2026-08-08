/**
 * A deliberately small TypeScript highlighter for the source viewer.
 *
 * It is not a parser and does not try to be: the only code it ever sees is the
 * handful of hand-written declarations in `src/content/projects.ts`. Pulling in
 * a real highlighter would add more bytes than the whole rest of the site for a
 * few dozen lines of display text.
 *
 * Token colours live in CSS (`.code-token-*`) rather than here, so the theme
 * owns them like everything else.
 *
 * Imported by `render-work-git-graph`, so this runs in Node at build time. No DOM.
 */

import { escapeHtml, unsafeTrustedHtml, type HtmlFragment } from "../../shared/html-template";

type TokenClass =
  | "comment"
  | "string"
  | "keyword"
  | "literal"
  | "type"
  | "function"
  | "property"
  | "punctuation"
  | "text";

interface TokenRule {
  readonly pattern: RegExp;
  /** `null` means "match it but leave it unstyled" — whitespace. */
  readonly tokenClass: TokenClass | null;
}

/**
 * Order matters: the first rule that matches at the cursor wins. Comments and
 * strings come first so a keyword inside either is not picked out.
 */
const TOKEN_RULES: readonly TokenRule[] = [
  { pattern: /^\/\*[\s\S]*?\*\//, tokenClass: "comment" },
  { pattern: /^\/\/[^\n]*/, tokenClass: "comment" },
  { pattern: /^"(?:[^"\\]|\\.)*"/, tokenClass: "string" },
  {
    pattern:
      /^\b(export|const|let|return|while|function|if|else|new|type|interface|as|async|await)\b/,
    tokenClass: "keyword",
  },
  { pattern: /^\b(true|false|null|undefined)\b/, tokenClass: "literal" },
  { pattern: /^\b\d[\w.]*\b/, tokenClass: "literal" },
  { pattern: /^[A-Z][A-Za-z0-9_]*/, tokenClass: "type" },
  { pattern: /^[a-zA-Z_$][\w$]*(?=\s*\()/, tokenClass: "function" },
  { pattern: /^[a-zA-Z_$][\w$]*(?=\s*:)/, tokenClass: "property" },
  { pattern: /^[{}()[\];:,.<>=!+\-*/&|?]+/, tokenClass: "punctuation" },
  { pattern: /^\s+/, tokenClass: null },
  { pattern: /^[^\s]/, tokenClass: "text" },
];

/**
 * Highlights one line. Returns a non-breaking space for a blank line so the
 * line keeps its height in the viewer's fixed 21px grid.
 */
export function highlightTypeScriptLine(line: string): HtmlFragment {
  let markup = "";
  let remaining = line;

  while (remaining.length > 0) {
    let matchedText: string | null = null;
    let matchedClass: TokenClass | null = null;

    for (const rule of TOKEN_RULES) {
      const match = rule.pattern.exec(remaining);
      if (match && match[0].length > 0) {
        matchedText = match[0];
        matchedClass = rule.tokenClass;
        break;
      }
    }

    // No rule matched: consume a single character so this can never loop.
    if (matchedText === null) {
      matchedText = remaining[0] as string;
      matchedClass = "text";
    }

    const escaped = escapeHtml(matchedText);
    markup += matchedClass ? `<span class="code-token-${matchedClass}">${escaped}</span>` : escaped;
    remaining = remaining.slice(matchedText.length);
  }

  return unsafeTrustedHtml(markup || "&nbsp;");
}

// Not a parser: it only has to handle the snippets in `src/content/projects.ts`.

import { escapeHtml, unsafeTrustedHtml, type HtmlFragment } from "../../lib/html-template";

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
  /** `null` consumes the match but leaves it unstyled. */
  readonly tokenClass: TokenClass | null;
}

/** First match wins. Comments and strings come first so keywords inside them stay plain. */
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

/** A blank line returns `&nbsp;` so it keeps its row in the viewer's fixed line grid. */
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

    // No rule matched: consume one character so the loop always ends.
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

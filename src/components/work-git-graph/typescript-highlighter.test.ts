/**
 * The highlighter is small and hand-rolled, which is the right call for a few
 * dozen lines of display code — but hand-rolled tokenisers have two classic
 * failure modes worth pinning down: a rule that matches nothing and loops
 * forever, and escaping that gets skipped because the input "is just code".
 */

import { describe, expect, it } from "vitest";

import { renderFragmentToMarkup } from "../../shared/html-template";
import { highlightTypeScriptLine } from "./typescript-highlighter";

const highlight = (line: string): string => renderFragmentToMarkup(highlightTypeScriptLine(line));

describe("highlightTypeScriptLine", () => {
  it("keeps a blank line occupying a row in the viewer’s fixed line grid", () => {
    expect(highlight("")).toBe("&nbsp;");
  });

  it("marks keywords", () => {
    expect(highlight("const")).toBe('<span class="code-token-keyword">const</span>');
  });

  it("marks a whole-line comment as a comment, keywords inside included", () => {
    expect(highlight("// const x")).toBe('<span class="code-token-comment">// const x</span>');
  });

  it("marks a string as a string, keywords inside included", () => {
    expect(highlight('"const"')).toBe('<span class="code-token-string">&quot;const&quot;</span>');
  });

  it("handles escaped quotes inside a string without ending it early", () => {
    expect(highlight('"a\\"b"')).toBe(
      '<span class="code-token-string">&quot;a\\&quot;b&quot;</span>',
    );
  });

  it("escapes markup characters in code — a generic parameter is not a tag", () => {
    const output = highlight("Promise<Receipt>");
    expect(output).toContain("&lt;");
    expect(output).toContain("&gt;");
    expect(output).not.toContain("<Receipt>");
  });

  it("preserves leading indentation, which is load-bearing in a code viewer", () => {
    expect(highlight("  return x").slice(0, 2)).toBe("  ");
  });

  it("terminates on input no rule matches", () => {
    // The fallback consumes one character per pass; without it this hangs.
    expect(() => highlight("€¥§")).not.toThrow();
    expect(highlight("€¥§")).toContain("€");
  });

  it("round-trips the visible text of a real line unchanged", () => {
    const line = "async function settle(tx: Transfer): Promise<Receipt> {";
    const visible = highlight(line)
      .replace(/<[^>]*>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
    expect(visible).toBe(line);
  });
});

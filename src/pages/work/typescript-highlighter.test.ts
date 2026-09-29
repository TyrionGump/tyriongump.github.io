import { describe, expect, it } from "vitest";

import { projects } from "../../content/projects";
import { renderFragmentToMarkup } from "../../lib/html-template";
import { highlightTypeScript } from "./typescript-highlighter";

const highlight = (code: string): string[] => highlightTypeScript(code).map(renderFragmentToMarkup);

const colorOf = (markup: string, text: string): string | undefined =>
  new RegExp(`<span style="color:var\\(--code-token-([a-z]+)\\)">${text}</span>`).exec(markup)?.[1];

const visibleText = (markup: string): string =>
  markup
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

describe("highlightTypeScript", () => {
  it("returns one fragment per line, and keeps a blank line one row tall", () => {
    const lines = highlight("const a = 1;\n\nconst b = 2;");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe(" ");
  });

  it("colours each kind of token", () => {
    const [line = ""] = highlight("export const ledger: System = { year: 2026 };");
    expect(colorOf(line, "const")).toBe("keyword");
    expect(colorOf(line, "System")).toBe("type");
    expect(colorOf(line, "year")).toBe("property");
    expect(colorOf(line, "2026")).toBe("literal");

    const [call = ""] = highlight("async function settle(tx: Transfer) {}");
    expect(colorOf(call, "settle")).toBe("function");
  });

  it("keeps keywords inside comments and strings as comment and string", () => {
    const [comment = ""] = highlight("// const x");
    expect(comment).not.toContain("--code-token-keyword");

    const [text = ""] = highlight('const s = "const";');
    expect(colorOf(text, "const")).toBe("keyword");
    expect(text).toContain('<span style="color:var(--code-token-string)">&quot;const&quot;</span>');
  });

  it("escapes markup in code, so a generic parameter is not a tag", () => {
    const [line = ""] = highlight("let p: Promise<Receipt>;");
    expect(line).toContain("&lt;");
    expect(line).not.toContain("<Receipt>");
  });

  it("keeps the text of every project's source exactly", () => {
    for (const project of Object.values(projects)) {
      const text = highlight(project.sourceCode)
        .map((line) => (line === " " ? "" : visibleText(line)))
        .join("\n");
      expect(text).toBe(project.sourceCode);
    }
  });
});

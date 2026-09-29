import { describe, expect, it } from "vitest";

import { escapeHtml, html, renderFragmentToMarkup, unsafeTrustedHtml } from "./html-template";

const render = renderFragmentToMarkup;

describe("escapeHtml", () => {
  it("escapes every character that can break out of an attribute or a tag", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("escapes the ampersand first, so escapes are not double-escaped", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("leaves ordinary prose untouched", () => {
    expect(escapeHtml("Melbourne, AU · open to work")).toBe("Melbourne, AU · open to work");
  });
});

describe("html", () => {
  it("escapes an interpolated string", () => {
    const hostile = "<script>alert(1)</script>";
    expect(render(html`<p>${hostile}</p>`)).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  });

  it("escapes a value interpolated into an attribute", () => {
    const hostile = '" onerror="alert(1)';
    expect(render(html`<span title="${hostile}"></span>`)).toBe(
      '<span title="&quot; onerror=&quot;alert(1)"></span>',
    );
  });

  it("inserts a nested fragment verbatim rather than escaping it twice", () => {
    const inner = html`<em>${"a & b"}</em>`;
    expect(render(html`<p>${inner}</p>`)).toBe("<p><em>a &amp; b</em></p>");
  });

  // These interpolate at the top level: inside a <ul>, the expected string would
  // depend on how the formatter lays out the markup.
  it("joins arrays with no separator, so list items do not get commas", () => {
    const items = ["one", "two"].map((text) => html`<li>${text}</li>`);
    expect(render(html`${items}`)).toBe("<li>one</li><li>two</li>");
  });

  it("escapes inside arrays too", () => {
    expect(render(html`${["<b>"]}`)).toBe("&lt;b&gt;");
  });

  it("renders null, undefined and false as nothing, so `cond && x` is safe", () => {
    expect(render(html`<p>${null}${undefined}${false}</p>`)).toBe("<p></p>");
  });

  it("renders zero, which is falsy but is still a value someone meant to show", () => {
    expect(render(html`<span>${0}</span>`)).toBe("<span>0</span>");
  });

  it("handles a template with no interpolations", () => {
    expect(render(html`<span></span>`)).toBe("<span></span>");
  });

  it("handles adjacent interpolations with no literal between them", () => {
    expect(render(html`${"a"}${"b"}`)).toBe("ab");
  });
});

describe("unsafeTrustedHtml", () => {
  it("passes markup through untouched", () => {
    expect(render(unsafeTrustedHtml("<br>"))).toBe("<br>");
  });

  it("is inserted verbatim when nested, which is the whole point and the whole risk", () => {
    expect(render(html`<p>${unsafeTrustedHtml("<br>")}</p>`)).toBe("<p><br></p>");
  });
});

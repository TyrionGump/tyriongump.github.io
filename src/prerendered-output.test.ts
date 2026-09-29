/**
 * Guards the prerender pipeline end to end.
 *
 * These render functions run in Node at build time and their output is baked
 * into `index.html`. That is what makes the site readable without JavaScript and
 * what a crawler sees — so "the content is actually in the markup" is a property
 * worth asserting, not assuming. A component that quietly stopped emitting its
 * prose would still look fine in the browser, because script would animate the
 * empty shell perfectly well.
 */

import { describe, expect, it } from "vitest";

import { renderConsoleOverlay } from "./chrome/console/render-console-overlay";
import { renderHomePage } from "./pages/home/render-home-page";
import { renderPersonalPage } from "./pages/personal/render-personal-page";
import { renderScrollProgressRing } from "./chrome/scroll-ring/render-scroll-progress-ring";
import { renderSiteNavigation } from "./chrome/navigation/render-site-navigation";
import { renderWorkPage } from "./pages/work/render-work-page";
import { projects, workGraphProjectIds } from "./content/projects";
import { notFoundPageId, renderPageHead } from "./render-page-document";
import { sitePages, siteUrl } from "./site-pages";
import { renderFragmentToMarkup } from "./lib/html-template";
import cascadeManifest from "./styles/index.css?raw";

const home = renderFragmentToMarkup(renderHomePage());
const work = renderFragmentToMarkup(renderWorkPage());
const personal = renderFragmentToMarkup(renderPersonalPage());
const navigation = renderFragmentToMarkup(renderSiteNavigation("work"));
const everything = [home, work, personal, navigation].join("\n");

describe("Home", () => {
  it("ships the finished session, not an empty panel", () => {
    expect(home).toContain("whoami");
    expect(home).toContain("Hi, I&#39;m Andrew.");
    expect(home).toContain("the API in the middle, and the screen you actually use.");
  });
});

describe("Work", () => {
  it("ships every graph commit’s prose", () => {
    for (const id of workGraphProjectIds) {
      const project = projects[id];
      expect(work).toContain(project.name);
      expect(work).toContain(project.oneLiner);
      expect(work).toContain(project.category);
      for (const section of project.story) expect(work).toContain(section.body);
      for (const metric of project.metrics) expect(work).toContain(metric.label);
    }
  });

  it("ships each source file highlighted rather than as a blank viewer", () => {
    expect(work).toContain("code-token-keyword");
    // 13 lines each for the two graph projects.
    const lineCount = work.split('class="source-viewer-line"').length - 1;
    expect(lineCount).toBe(26);
  });

  it("shows only the two most recent commits in the graph", () => {
    expect(work).toContain('data-commit="ledger"');
    expect(work).toContain('data-commit="harbor"');
    expect(work).not.toContain('data-commit="prism"');
    expect(work).not.toContain('data-commit="sift"');
  });

  it("gives every commit toggle a target that exists", () => {
    const controlled = [...work.matchAll(/aria-controls="([^"]+)"/g)].map((match) => match[1]);
    expect(controlled.length).toBe(workGraphProjectIds.length);
    for (const id of controlled) expect(work).toContain(`id="${id}"`);
  });
});

describe("Personal", () => {
  it("ships the bio and the contact details", () => {
    expect(personal).toContain("I started on backends");
    expect(personal).toContain("github.com/TyrionGump");
    expect(personal).toContain("Distributed clocks");
  });

  it("ships all four projects, including the two the Work graph omits", () => {
    for (const id of ["ledger", "harbor", "prism", "sift"] as const) {
      expect(personal).toContain(projects[id].shortDescription);
    }
  });

  it("renders the console trigger as a real button inside the sentence", () => {
    expect(personal).toContain("data-console-trigger");
    expect(personal).toMatch(/I keep a\s*<button[^>]*>\s*terminal\s*<\/button>\s*open on a second/);
  });
});

describe("every prerendered fragment", () => {
  it("leaves no unresolved template interpolation", () => {
    expect(everything).not.toContain("[object Object]");
    expect(everything).not.toContain("undefined");
    expect(everything).not.toContain("NaN");
  });

  it("opens external links safely", () => {
    const externalLinks = [...everything.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)];
    expect(externalLinks.length).toBeGreaterThan(0);
    for (const [tag] of externalLinks) expect(tag).toContain('rel="noreferrer noopener"');
  });

  it("gives the site-wide overlays the hooks their mount code requires", () => {
    // `requireElement` throws on a miss, so a rename here is a blank page.
    const overlay = renderFragmentToMarkup(renderConsoleOverlay());
    for (const hook of [
      "data-console-overlay",
      "data-console-body",
      "data-console-output",
      "data-console-typed",
      "data-console-input",
    ]) {
      expect(overlay).toContain(hook);
    }
    expect(renderFragmentToMarkup(renderScrollProgressRing())).toContain("data-scroll-ring-arc");
  });

  it("gives each page mount the hook `main.ts` looks up", () => {
    expect(home).toContain("data-home-terminal-panel");
    expect(work).toContain("data-work-graph");
  });
});

describe("the HTML files", () => {
  const htmlFiles = import.meta.glob(
    ["../index.html", "../*/index.html", "../404.html", "!../dist/**", "!../node_modules/**"],
    { query: "?raw", import: "default", eager: true },
  ) as Record<string, string>;

  const pageIdOf = (markup: string) => /<html\b[^>]*\bdata-page="([^"]+)"/.exec(markup)?.[1];

  it("has exactly one file per page, at the page's path", () => {
    const expected = Object.fromEntries([
      ...sitePages.map((page) => [`..${page.path}index.html`, page.route]),
      ["../404.html", notFoundPageId],
    ]);
    const actual = Object.fromEntries(
      Object.entries(htmlFiles).map(([path, markup]) => [path, pageIdOf(markup)]),
    );
    expect(actual).toEqual(expected);
  });
});

describe("each page's head", () => {
  const head = (pageId: string) => renderFragmentToMarkup(renderPageHead(pageId));

  it("gives every page its own title, description and canonical URL", () => {
    for (const page of sitePages) {
      const markup = head(page.route);
      expect(markup).toContain(`<title>${page.title}</title>`);
      expect(markup).toContain(`<link rel="canonical" href="${siteUrl}${page.path}" />`);
      expect(markup).toContain(`<meta property="og:url" content="${siteUrl}${page.path}" />`);
    }
    expect(new Set(sitePages.map((page) => page.title)).size).toBe(sitePages.length);
  });

  it("keeps the 404 page out of search results", () => {
    expect(head(notFoundPageId)).toContain('<meta name="robots" content="noindex" />');
    expect(head(notFoundPageId)).not.toContain("canonical");
  });

  it("sends old #route links on from Home only", () => {
    expect(head("home")).toContain("location.replace");
    expect(head("work")).not.toContain("location.replace");
  });

  it("rejects a page id that is not a page", () => {
    expect(() => head("blog")).toThrow(/neither a route/);
  });
});

describe("the navigation", () => {
  it("marks only the current page", () => {
    expect(navigation.match(/aria-current="page"/g)).toHaveLength(1);
    expect(navigation).toMatch(/href="\/work\/"\s+aria-current="page"/);
  });
});

describe("the cascade manifest", () => {
  /**
   * `styles/index.css` is the only file that imports CSS, so a stylesheet
   * missing from it ships silently unstyled with every gate green. The prerender
   * plugin throws in both directions for slots; these are the same guard for
   * stylesheets — and they cover `styles/` as well as `components/`, because
   * either can be orphaned the same way.
   */
  const manifest = "./styles/index.css";
  const stylesheetsOnDisk = [
    ...Object.keys(import.meta.glob("./styles/*.css")),
    ...Object.keys(import.meta.glob("./chrome/*/*.css")),
    ...Object.keys(import.meta.glob("./pages/*/*.css")),
  ]
    .filter((path) => path !== manifest)
    // Rewritten as `index.css` has to write them: its own siblings by name,
    // component stylesheets one level up.
    .map((path) =>
      path.startsWith("./styles/") ? path.replace("./styles/", "./") : path.replace("./", "../"),
    );

  // Comments are stripped first: a commented-out `@import` is precisely the
  // silent orphan this guards against, and raw text would still match it. Both
  // `@import "x"` and the equivalent `@import url("x")` are accepted, and the
  // quote style is the formatter's business, not this test's.
  const active = cascadeManifest.replace(/\/\*[\s\S]*?\*\//g, "");
  const listedPaths = [...active.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)].map(
    (match) => match[1],
  );

  it("lists every stylesheet that exists", () => {
    expect(stylesheetsOnDisk.length).toBeGreaterThan(0);
    for (const path of stylesheetsOnDisk) expect(listedPaths).toContain(path);
  });

  it("lists nothing that does not exist", () => {
    for (const path of listedPaths) expect(stylesheetsOnDisk).toContain(path);
  });
});

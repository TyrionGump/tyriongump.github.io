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

import documentMarkup from "../index.html?raw";
import { renderConsoleOverlay } from "./components/console-overlay/render-console-overlay";
import { renderHomePage } from "./components/home-terminal-panel/render-home-terminal-panel";
import { renderPersonalPage } from "./components/personal-page/render-personal-page";
import { renderScrollProgressRing } from "./components/scroll-progress-ring/render-scroll-progress-ring";
import { renderSiteNavigation } from "./components/site-navigation/render-site-navigation";
import { renderWorkPage } from "./components/work-git-graph/render-work-git-graph";
import { projects, workGraphProjectIds } from "./content/projects";
import { defaultRouteName, routeNames } from "./routing/route-names";
import { renderFragmentToMarkup } from "./shared/html-template";
import cascadeManifest from "./styles/index.css?raw";

const home = renderFragmentToMarkup(renderHomePage());
const work = renderFragmentToMarkup(renderWorkPage());
const personal = renderFragmentToMarkup(renderPersonalPage());
const navigation = renderFragmentToMarkup(renderSiteNavigation());
const everything = [home, work, personal, navigation].join("\n");

describe("Home", () => {
  it("ships the finished session, not an empty panel", () => {
    expect(home).toContain("whoami");
    expect(home).toContain("Hi, I&#39;m Andrew.");
    expect(home).toContain("the API in the middle, and the screen you actually use.");
  });

  // Derived rather than hardcoded: `homeMenuItems` is an array, so omitting a
  // route from the menu is not a type error.
  it("ships every menu destination as a real link", () => {
    for (const route of routeNames) {
      if (route === defaultRouteName) continue;
      expect(home).toContain(`href="#${route}"`);
    }
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

describe("the document and the route list", () => {
  /**
   * The prerender plugin's slot pattern matches the `<!--prerender:name-->`
   * comment and nothing else — it never reads `id` or `data-page`. So a route
   * with a slot but no wrapping section satisfies the plugin, `tsc`, every test
   * above and `vite build`, and then `main.ts` finds no active page and the
   * route ships blank. This is the only assertion that reads the document.
   */
  it("gives every route a prerender slot inside its own section", () => {
    for (const route of routeNames) {
      // The pair, not the two halves separately: a slot that sits outside its
      // section satisfies the plugin and every other gate, and then ships an
      // empty page. Route slots are named `<route>-page`; the three slots for
      // the nav and the overlays are not — see the slot map in `vite.config.ts`.
      expect(documentMarkup).toMatch(
        new RegExp(`<section[^>]*data-page="${route}"[^>]*>\\s*<!--prerender:${route}-page-->`),
      );
    }
  });

  // `render-site-navigation.ts` writes its hrefs as literals and does not import
  // the route list, so a new route can prerender, pass everything else here, and
  // still be reachable only by typing the hash.
  it("links every non-default route from the navigation", () => {
    for (const route of routeNames) {
      if (route === defaultRouteName) continue;
      // Both on the same tag. `data-navigation-route` only drives the active
      // class, so asserting it alone would pass a link whose href is misspelled
      // — it would still highlight correctly and still navigate to Home.
      expect(navigation).toMatch(
        new RegExp(`<a\\b[^>]*href="#${route}"[^>]*data-navigation-route="${route}"`),
      );
    }
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
    ...Object.keys(import.meta.glob("./components/*/*.css")),
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

# Architecture

How the site is built. For why a choice was made, see
[decisions.md](decisions.md).

---

## Pages

Each page is a real HTML file:

```
index.html            Home, at /
work/index.html       Work, at /work/
personal/index.html   Personal, at /personal/
404.html              served by GitHub Pages for any unknown path
```

Each file names its page with `<html data-page="…">` and has two slots,
`<!--prerender:head-->` and `<!--prerender:body-->`. Nothing else is in the files.

[`src/site-pages.ts`](../src/site-pages.ts) is the list of pages. Each entry has a
route, a path, a label, a title and a description. These come from that list:

- the navigation, the footers and the Home menu;
- the console's page commands and its `help`;
- each page's `<title>`, description, canonical URL and share tags;
- the build inputs in `vite.config.ts`.

---

## The prerender step

Script does not draw the page content. The build puts it into the HTML first.

[`build/prerender-content-plugin.ts`](../build/prerender-content-plugin.ts) reads
`data-page` from each HTML file. Then it fills each slot from the renderers in
[`src/render-page-document.ts`](../src/render-page-document.ts). A slot with no
renderer, or a renderer with no slot, stops the build.

The plugin runs at build time and on each dev-server request, so dev and build
use the same path.

The result:

- The site is readable with JavaScript off.
- Crawlers and link previews get real text.
- Reduced motion only means "skip the animation". There is no second render path.

---

## Four conventions

There is no UI framework. These four rules do its job.

### 1. `render-*` is pure, `mount-*` touches the DOM

```
render-work-page.ts   data in, markup out. No DOM. Runs in Node.
mount-work-page.ts    adds behaviour to markup that already exists.
```

`vitest run` and `vite build` both run every `render-*` in Node. So a DOM call on
the render path fails CI.

`commit-formatting.ts`, `graph-geometry.ts` and `typescript-highlighter.ts` have
no prefix. The render side and the mount side both use them, so they must stay
free of the DOM too.

### 2. A `CleanupScope` owns every timer and listener

A [`CleanupScope`](../src/lib/cleanup-scope.ts) holds the timers, intervals,
listeners and observers that a piece of behaviour creates. `dispose()` releases
all of them. It also stops callbacks that fire after that.

`scope.delay()` never resolves on a disposed scope. So an `async` sequence stops
at its next `await`, with no check after each step. For example, a click during
the Work graph's draw disposes the draw's scope, and the draw stops.

### 3. Classes are for CSS, `data-*` attributes are for script

Script finds elements only through `data-*` attributes. So you can rename a class
for styling and no behaviour breaks.
[`src/script-hooks.test.ts`](../src/script-hooks.test.ts) fails if a script finds
or tests an element by class.

### 4. `src/styles/index.css` is the cascade, in order

Every stylesheet is `@import`ed from this one file, in cascade order. To find out
which rule wins, read down one list. A test fails if a stylesheet on disk is
missing from the list, or if the list names a file that does not exist.

---

## Page changes in place

[swup](https://swup.js.org) changes pages without a page load. On a click, it
fetches the next page and replaces the navigation and `<main>`. Its plugins
update the `<head>` and `<html data-page>`, announce the new page to screen
readers, reset the focus as a page load would, restore the scroll position, and
fetch pages when the visitor points at a link.

- Only [`mount-page-transitions.ts`](../src/chrome/page-transitions/mount-page-transitions.ts)
  imports swup. Delete it and its call in `main.ts`, and every page change is a
  normal page load again.
- Script starts a page change with `navigateTo()` from
  [`lib/navigation.ts`](../src/lib/navigation.ts). swup takes it over when it
  runs.
- Each page mount returns a cleanup function. `main.ts` calls it before swup
  replaces the page, and mounts the new page after.
- The console is outside the replaced markup, so it stays open and keeps its
  transcript.

Links opened in a new tab, a refresh, and visits without JavaScript still load
real pages.

---

## State across page loads

A refresh or a new tab is a real page load. Two things must survive it, so they
are kept in `sessionStorage` through
[`lib/session-store.ts`](../src/lib/session-store.ts):

- **Work.** The graph draws once in each session. A return visit shows it
  finished, and the commit that was open is open again.
- **The console.** The page keeps the command history, not the HTML. A new page
  runs the history again, with a context that has no side effects. So the
  transcript comes back, but no command navigates or opens a tab a second time.

If storage is full or blocked, nothing is kept and the pages still work.

---

## Layout

```
index.html, work/, personal/, 404.html   one HTML file per page
build/          the prerender Vite plugin. Runs in Node, never ships.
src/
  site-pages.ts           the list of pages
  render-page-document.ts the <head> and <body> that every page shares
  main.ts                 mounts the chrome, then the current page
  lib/          html templating, DOM helpers, CleanupScope, session store,
                and motion/. Knows nothing about this site.
  content/      page text and data
  chrome/       on every page: navigation, footer, console, scroll ring,
                and the in-place page changes
  pages/        one folder per page: home/, work/, personal/, not-found/
  styles/       tokens, reset, keyframes, layout, and the cascade list
tests/e2e/      Playwright tests, run against the production build
```

**Imports go one way:** `lib` → `site-pages` → `content` → `chrome` → `pages` →
the three files at the top of `src/`. `.oxlintrc.json` enforces this:

- `lib/` imports nothing else from `src/`.
- `content/` imports no code.
- `chrome/` imports no page, and a page imports no other page.
- Only `main.ts` imports `mount-*` modules.
- `build/` imports only Node-safe code.

`import/no-cycle` rejects any cycle, including one made of type imports.

`render-*` modules compose freely. For example, Work and Personal both call
`renderSiteFooter`.

---

## Adding a page

1. Add an entry to `sitePages` in `src/site-pages.ts`.
2. Copy `work/index.html` to the new path, and change `data-page`.
3. Add a renderer to `pageRenderers` in `src/render-page-document.ts`.
4. Add a line to `homeMenuDescriptions` in `src/content/home-page-content.ts`.
5. If the page has behaviour, add it to `pageMounters` in `src/main.ts`.
6. Run `pnpm check`.

**Note:** You cannot skip steps 2, 3 or 4. The compiler rejects a missing
renderer or menu line. A test fails if a page has no HTML file, or a file has no
page.

---

## Behaviour that looks like detail but is not

**The git graph draws at one constant speed** (0.46 px/ms). The corner is timed by
its own arc length, so the bend moves at the same speed as a straight line. Each
row starts on the real `transitionend` of the stroke above it, not on a sum of
durations. A sum either runs ahead of the stroke or needs padding that shows as a
pause.

**Command output appears all at once**, not line by line. A real shell returns its
output in one step.

**Opening a commit holds the clicked row still.** When you switch commits, the old
body closes at once. When you close a commit, it shrinks over time. If a lot of
height goes in one step, the browser clamps the scroll position, and the old
position cannot come back. See
[`commit-row-expansion.ts`](../src/pages/work/commit-row-expansion.ts).

**Home plays its intro on each visit.** Work draws its graph once in each session.

---

## Deployment

This is a GitHub Pages **user site** at the domain root, so Vite's default
`base` of `/` is correct.

- GitHub Pages serves `/work/` from `work/index.html`.
- It serves `404.html` for any path that does not exist.
- Old links such as `/#work` load Home, and an inline script in Home's `<head>`
  sends them to `/work/`.

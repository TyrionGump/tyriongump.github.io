# Architecture

How the site is put together. For _why_ a given choice was made, see
[decisions.md](decisions.md).

---

## The prerender pipeline

Page content is not drawn by script. It is baked into `index.html` before the
browser ever sees it, and script only attaches behaviour on top.

`index.html` marks each insertion point with a `<!--prerender:name-->` comment.
[`build/prerender-content-plugin.ts`](../build/prerender-content-plugin.ts) swaps
each one for the markup its renderer returns, using the slot → renderer map in
`vite.config.ts`. A mismatch in either direction — a slot with no renderer, or a
renderer with no slot — throws rather than shipping a hole.

This runs **at build time and on every dev-server request**. The plugin declares
`transformIndexHtml` with no `apply` field, so there is no separate dev path that
can drift from the built one.

What the plugin does **not** check is that a slot has a section to live in: its
pattern reads the comment token and never looks at `id` or `data-page`. A route
with a slot but no `<section data-page>` would satisfy the plugin, `tsc`, every
test and `vite build`, and then ship blank — `main.ts` finds no active page and
returns. [`src/prerendered-output.test.ts`](../src/prerendered-output.test.ts)
asserts the correspondence instead.

The payoff: the site is readable with JavaScript disabled, crawlers get prose
rather than an empty div, and `prefers-reduced-motion` becomes "skip the
enhancement" rather than a second render path for every animation.

---

## Four conventions

There is no UI framework. Its job is done by these instead.

### 1. `render-*` is pure, `mount-*` touches the DOM

```
render-work-git-graph.ts   string in, string out. No DOM. Runs in Node.
mount-work-git-graph.ts    attaches behaviour to markup that already exists.
```

The split is enforced by execution, not by convention alone: `vitest run` and
`vite build` both run every `render-*` in Node, so a DOM call on the prerender
path fails CI with a stack trace.

Three modules on that path carry no `render-` prefix — `commit-formatting.ts`,
`graph-geometry.ts`, `typescript-highlighter.ts` — and `graph-geometry.ts` is
imported by both halves, so no naming scheme can assign it a side. Each says in
its header which side it runs on.

### 2. `mount-*` returns a cleanup function

Everything a component creates — timers, intervals, listeners, observers — is
owned by a [`CleanupScope`](../src/lib/cleanup-scope.ts). Disposing it
releases all of them _and_ swallows callbacks that fire afterwards, which stops a
half-finished typing sequence writing into DOM that has been replaced.

`scope.delay()` is the load-bearing part: a disposed scope never resolves it, so
an `async` sequence abandons itself mid-flight just by awaiting. That replaces an
`if (dead) return` check after every step.

### 3. Classes style, `data-*` attributes are JS hooks

If it has a class, CSS owns it. If it has a `data-` attribute, script looks it up
by it. You can tell what is safe to rename by looking at it.

### 4. `src/styles/index.css` is the cascade, in order

Every stylesheet that ships is listed there, in the order it cascades. Component
CSS lives beside its component and is `@import`ed from that one file, so "what
wins?" is answered by reading down a single list.

---

## Themes

Five palettes ship. Bone is the default and the one the design was tuned on; the
other four are one attribute on the root element, no JavaScript:

```html
<html data-theme="sage">
  <!-- or slate, amber, lilac -->
</html>
```

A theme moves the accent and the near-black surfaces only — the neutral greys are
shared, which is what keeps the five looking like one design rather than five.
Bone pins its status colour to green; the others let it follow the accent.

---

## Layout

```
build/          the prerender Vite plugin. Node-only tooling; never ships.
src/
  lib/          html templating, DOM helpers, CleanupScope, and motion/.
                Knows nothing about this site; imports nothing outside itself
  routing/      hash router, route names, page lifecycle
  content/      page prose and data
  chrome/       what every page shares: navigation, footer, console, scroll ring
  pages/        one directory per route: home/, work/, personal/
  styles/       tokens, themes, reset, keyframes + the cascade manifest
  main.ts       the only place things are wired together
```

**Imports run one way:** `lib` → `routing` → `content` → `chrome` → `pages` →
`main.ts`. `.oxlintrc.json` enforces it with one `no-restricted-imports`
override per directory. A page may not import another page, and only `main.ts`
imports `mount-*` modules. `import/no-cycle` rejects anything that imports
`main.ts`.

**The build reaches into `src/` in two places.** `build/prerender-content-plugin.ts`
imports only `lib/html-template`, the one Node-safe module in `lib/`.
`vite.config.ts` imports the `render-*` entry points named in the slot map.

**`styles/index.css` `@import`s upward into `chrome/*/*.css` and `pages/*/*.css`.** That is the one
upward arrow in the repo, it is CSS rather than TypeScript, and it is deliberate:
exactly one file may own an order. A stylesheet missing from it ships silently
unstyled, so `prerendered-output.test.ts` checks both directions.

**Components never reach for each other's behaviour.** `mount-*` are wired only
in `main.ts`. Their `render-*` halves do compose freely: `render-site-footer` is
called straight from Work and Personal, which is what pure functions are for, and
is how the footer reaches two pages without `main.ts` assembling markup at
runtime.

---

## Adding a route

Add it to [`src/routing/route-names.ts`](../src/routing/route-names.ts), then run
the tests. They will tell you the rest — the slot, the section, the navigation
link and the home menu are all asserted against the route list, so anything you
forget fails rather than shipping quietly.

Which sections are routes is stated in `index.html` (`<section data-page>`) and
listed in `route-names.ts`. It is deliberately not restated in prose anywhere: a
duplicated list drifts, a pointer to an enforced fact does not.

`pageMounters` in `main.ts` stays partial on purpose — a route with no behaviour
is legitimate. Personal has none.

---

## Behaviour that looks like detail but is not

**The git graph draws at one constant speed** (0.46 px/ms), and the corner is
timed by its own arc length so the bend travels at the same rate as a vertical.
Rows chain on the real `transitionend` of the stroke above them, never on a
running total of durations — a total either races the trunk or needs padding that
reads as a pause. `graph-geometry.test.ts` pins the speed, because a graph drawn
at inconsistent speeds looks fine in a screenshot and wrong in motion.

**Command output renders all at once**, never staggered line by line. A real
shell returns its output in one beat; staggering reads as decoration.

**Opening a commit holds the clicked row still.** Switching collapses the outgoing
body instantly — the scroll anchor would otherwise chase a target moving a
thousand pixels. Closing shrinks it over time instead, because folding that much
height in one pass makes the browser snap the scroll position back, and once it
does the old position cannot be recovered. See
[`commit-row-expansion.ts`](../src/pages/work/commit-row-expansion.ts).

**Home replays on every visit; Work and Personal do not.** Arriving at Home
should feel like arriving. Watching the graph redraw every time you come back
from Personal would not. See
[`page-lifecycle.ts`](../src/routing/page-lifecycle.ts).

---

## Deployment shape

This is a GitHub Pages **user site**, served from the domain root, so `base` is
`'/'` in `vite.config.ts`.

Routing is hash-based (`#home`, `#work`, `#personal`). Pages serves static files
with no rewrite rules, so hash routing is what makes deep links work without a
`404.html` redirect trick — the server only ever has to find `index.html`.

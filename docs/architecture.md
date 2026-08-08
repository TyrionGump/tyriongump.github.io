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
owned by a [`CleanupScope`](../src/animation/cleanup-scope.ts). Disposing it
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
  content/      page prose and data. Structural labels — section headings,
                inline link text — stay in the render-* that lays them out
  styles/       tokens, themes, reset, keyframes + the cascade manifest
  routing/      hash router, route names, page lifecycle
  animation/    DOM motion and lifetime primitives, no site knowledge.
                Imports nothing outside itself
  shared/       html templating, DOM helpers
  components/   one directory per component
  main.ts       composition root — the only place things are wired together
```

**Imports run one way:** `shared` → `animation` → `routing` → `content` →
`components` → `main.ts`, and nothing imports `main.ts`. This is enforced.
`.oxlintrc.json` carries one `no-restricted-imports` override per layer, so
reaching sideways or upward fails `pnpm lint` with a message naming the rule.

`main.ts` needs no rule of its own: it imports the whole tree, so anything
importing it forms a cycle, and `import/no-cycle` — configured with
`ignoreTypes: false`, so type-only edges count — rejects it. That rule also stops
a cycle forming inside a single layer, which the direction rules cannot see.

**The tooling layer reaches into `src/` in exactly two places, and they are
different files.** `build/prerender-content-plugin.ts` imports
`shared/html-template` and nothing else; `vite.config.ts` imports the six
`render-*` entry points named in the slot map. Nothing else, ever — the rest of
`shared/` needs a DOM at call time, and only `html-template.ts` is Node-safe.
`.oxlintrc.json` enforces the `build/` half.

**`animation/` earns its place by being skippable, not by being reused.** Four of
its seven modules have exactly one caller, and that is fine. `cleanup-scope.ts` is
a lifetime primitive rather than an animation; it lives there because everything
in the directory needs it and it needs nothing itself. The router imports it too.

**`styles/index.css` `@import`s upward into `components/*.css`.** That is the one
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
height in one pass makes the browser clamp the scroll position, and clamping is
lossy. See
[`commit-row-expansion.ts`](../src/components/work-git-graph/commit-row-expansion.ts).

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

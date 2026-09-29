# Decisions

Choices that cost more to explain than the code they affect, kept here so the
source files can stay short. Each entry says what was chosen and what the
alternative would have cost — not how the code works, which is
[architecture.md](architecture.md)'s job.

---

## No UI framework

The site has three static routes, no business logic, no data fetching and no
shared reactive state. What it does have is a lot of imperative DOM animation:
measuring `offsetHeight`, chaining on real `transitionend` events, driving
`window.scrollTo` per frame, typing characters into text nodes on timers.

A virtual DOM helps with none of that. Every one of those operations would live
inside a ref and an effect, bypassing the framework entirely — so the framework
would be carried for the parts of the site that do not exist. Its job is done by
the four conventions in [architecture.md](architecture.md) instead.

---

## Fonts are self-hosted, not fetched from the Google Fonts CDN

`public/fonts/` holds two **variable** woff2 files covering the whole 400–700
axis, one per family, declared in [`src/styles/fonts.css`](../src/styles/fonts.css).
Together they replace the eight static instances the Google Fonts URL pulled, at
about 55 KB.

Four reasons, roughly in order of weight:

- **The shared-cache argument is dead.** "The visitor probably has Manrope cached
  from another site" stopped being true when browsers partitioned the HTTP cache
  per top-level site. There is no upside left to trade for.
- **It removes two origins from the critical path.** First paint used to wait on
  DNS and TLS to `fonts.googleapis.com`, and the CSS that came back triggered the
  same round again for `fonts.gstatic.com`. These now arrive over a connection
  the browser already has.
- **It stops sending every visitor's IP address to a third party.**
- **It fixed a real bug.** The console chip asks for JetBrains Mono at weight 700,
  which the old URL never loaded — it requested 300, 400 and 500 — so the browser
  was synthesising a fake bold. A variable font carries the real weight.

Changing which weights the CSS uses needs no new download: a variable font
already contains the whole range.

The `unicode-range` mirrors Google's own latin subset. Glyphs outside it — the
`❯` prompt, `✓`, `▊`, `→` — fall through to a system font, which is what they
already did under the old URL too.

---

## Personal ships in prose mode only

The design also specifies a "session" mode that replays the same content as a
shell transcript. It is not built, and should not be.

Home, Work and the console are all the machine talking. Personal is the one place
a person speaks directly. Replaying it as another shell session would flatten
exactly the moment that earns the rest of the idea — and two complete designs
for one page is maintenance nobody ever sees the benefit of.

---

## Only the hairline footer is built

The design offers four footer styles. The other three are alternates it already
chose between, so carrying them would be dead code behind an option nothing sets.

---

## One palette

The design had four alternate themes. Nothing on the site could select them, so
they were deleted. Each colour is now defined once in `design-tokens.css`, and
translucent uses mix it with `color-mix()`.

---

## The scrollbar's transparency fade is not ported

The design animates `scrollbar-color` every frame while scrolling. It is
undocumented, and
it largely duplicates what macOS overlay scrollbars already do on their own.

---

## One real HTML page per route, not hash routing

The site used to be one document with hash URLs: `/#work`, `/#personal`. Now each
page is its own HTML file at a real path.

Hash routing cost three things:

- **Every shared link previewed as Home.** Link-preview bots ignore the part after
  `#` and do not run script. There was one `<title>` and no share tags.
- **Screen readers heard nothing on a page change.** A real page load announces
  the new page and resets focus. A hash router must do both by hand, and this one
  did neither.
- **The skip link had to be a script button**, because any `#target` changed the
  route.

The reason for hash routing was also false. GitHub Pages serves `work/index.html`
for `/work/`, so real paths need no rewrite rules and no `404.html` trick.

What the change cost:

- Each page change became a full load, with the tab's loading spinner. swup now
  changes pages in place. See the next entry.
- Work and the console lost their in-memory state. `sessionStorage` now keeps the
  small part that matters. See [architecture.md](architecture.md).
- Old `/#work` links needed a redirect. An inline script in Home's `<head>` does
  it.

---

## swup changes pages in place

A full load on each click showed the tab's loading spinner. swup fetches the next
page and swaps its content, so there is no spinner. The real pages stay, so share
previews, refreshes and visits without JavaScript do not change.

**Why a package, not our own router.** The basic flow is small, but the edge
cases are not: Cmd-click, `target="_blank"`, same-page anchors, a second click
during a fetch, a failed fetch, scroll restoration, focus and screen-reader
announcements. swup has fixed these over years. Custom code here is kept for what
is unique: the typing, the graph and the scroll anchor.

**Why swup.** It fits a site of real pages: it replaces only the containers you
name, and the console overlay stays outside them. In September 2026 it had a
release that month, 3 open issues, and about 40,000 weekly downloads. Turbo was
the other candidate. It has company backing, but it replaces the whole `<body>`,
shows cached pages by default, and had 353 open issues. Barba had no release
since August 2024.

**The risk.** Two volunteers do almost all of swup's work. If they stop, a pinned
version keeps working, because it uses only stable browser APIs and no service.
Only `mount-page-transitions.ts` imports swup, and the site works without it, so
removal is one file and one import.

**The cost.** It is the first dependency that ships to visitors: about 15 KB
gzipped, with all four plugins. That took the site's JavaScript from about 11 KB
to about 26 KB. Dependabot watches the swup packages for this reason.

---

## Shiki highlights the code, at build time only

The source viewer used a small hand-written tokenizer. It worked only for the
snippets in `projects.ts`. Shiki uses the same grammars as VS Code, so it reads
any TypeScript correctly, and it is the usual choice of current static-site
tools. In September 2026 it had about 26 million weekly downloads and a release
in August.

It runs in the prerender step, so visitors download nothing more. It uses the
JavaScript regex engine and only the TypeScript grammar, which keeps its API
synchronous and the build fast. The build went from about 0.3 to about 0.7
seconds.

A small theme maps Shiki's token types to CSS variables in `work-page.css`, so
the stylesheet still owns the colours. The markup comes from our own `html`
template, so every token is escaped.

---

## The cascade is one ordered list, not `@layer`

`@layer` sets the cascade order, but it does not import anything. Every stylesheet
must still be imported from somewhere, so the list in `styles/index.css` and the
test that checks it would both stay. `@layer` would only add a wrapper to every
file.

---

## One rule for script hooks, not a hooks file for each component

A `hooks.ts` file for each component would hold the `data-*` names that its render
and mount code share. It adds one more file to follow for each component. One
rule gives most of the same safety: script finds elements only through `data-*`
attributes, and `script-hooks.test.ts` fails on any lookup by class. `requireElement`
throws when a required hook is missing.

---

## Content edits restart the dev server

`vite.config.ts` imports the renderers, and the renderers import `src/content/`.
So Vite treats the content as part of the config, and restarts the dev server when
it changes. The restart takes about one second. A fix would load the renderers
through Vite's module runner instead. That is not worth the extra moving part for
a one-second wait.

---

## Toolchain

**Node 24.** `.nvmrc` pins it and the deploy workflow reads that file, so 24 is
the only version this project is actually tested on. The `engines` field says
`>=20.19`, which is the floor the dependencies need — not a target. If you use
nvm, note that its lazy shell shim does not load in non-interactive shells, so
scripts and editors may find whatever `node` is on the bare `PATH` instead. A
`v16` on `PATH` fails on this toolchain in ways that do not name the cause.

**Playwright** tests the behaviour that Node cannot: keyboard handling, focus,
page loads and animation. The tests run against the production build. The test
server builds first, and the build takes about a second, so a stale `dist/` can
never pass. The tests use reduced motion by default, so they see final states at
once. The tests that need motion turn it back on.

**TypeScript 7** is the native (Go) compiler. It is a drop-in for `tsc --noEmit`
here and type-checks the project in about 0.15s. Nothing else in the toolchain
uses it — Vite and Vitest strip types with their own transforms — so it only ever
runs as a checker.

**oxfmt** runs on stock defaults. `.oxfmtrc.json` sets nothing but the `$schema`
— it exists only because oxfmt prints a "no config found" notice on every run
otherwise, which is noise in CI logs. Worth knowing: oxfmt's default `printWidth`
is **100**, not Prettier's 80, so the width this codebase wraps at needs no
config. Defaults also mean double quotes, and the formatter reaches inside `html`
tagged templates as well as JS, TS, CSS and Markdown.

**oxlint** enables `correctness`, `suspicious` and `perf` as **errors**. The
categories matter more than they look: by default oxlint enables only
`correctness`, and only at _warning_ severity — a committed `debugger` statement
exits 0 and sails through CI. Turning the categories on is what makes `pnpm lint`
a gate rather than a suggestion.

Nothing in `.oxlintrc.json` weakens a rule. Everything there is additive: the
`import` plugin for cycle detection, and per-directory `no-restricted-imports`
patterns that enforce the import direction described in
[architecture.md](architecture.md). Before that config existed the ordering was a
claim in prose; now `lib/` reaching into `content/` fails CI with a message
naming the rule it broke. `import/no-unassigned-import` also stops script from
importing CSS. Each page links the stylesheet from its `<head>` instead. An import
from script makes the dev server paint each page before its styles arrive.

Three things to know before editing those overrides:

- **oxlint's regex has no lookahead or lookbehind** (it is the Rust `regex`
  crate). "Everything under `src/` except these two" cannot be written directly,
  which is why the `build/` rule names the directories it forbids rather than the
  ones it allows. Add a new forbidden path when you add a new layer.
- **Patterns must tolerate every spelling of the same import.** `../lib/`
  and `../../src/lib/` reach the same module; a pattern anchored only to
  `\.\./lib/` misses the second and the boundary silently has a hole. The
  patterns here use `(\.\./)+(src/)?` for that reason.
- **The patterns match relative specifiers**, so they hold only while imports
  stay relative. Adding a tsconfig path alias would route around all of them.

After changing a boundary, confirm it still fails on a deliberate violation and
still passes on a legitimate import. A rule that cannot fire is indistinguishable
from a rule that passes, and every mistake above shipped green at least once.

### On suppressions

There are exactly two, both scoped to a single loop and both carrying their
reason inline:

```
src/lib/motion/type-into-element.ts    no-await-in-loop
src/pages/work/graph-draw-sequence.ts  no-await-in-loop
```

Both are animation sequences that are serial _by definition_ — a typewriter, and
a pen drawing one stroke after another. The lint's suggested fix (`Promise.all`)
would put the whole string on screen in one frame, and start every rail of the
graph drawing at once. The rule stays live everywhere else, where it correctly
catches independent async work being needlessly serialised.

The suppression is deliberate rather than unavoidable, which matters if you ever
sweep for them: a `reduce` chain over `.then()` would satisfy the lint with
identical behaviour and no directive. It was rejected because it makes the most
important loop in the codebase markedly harder to read for no behavioural gain.
Rewriting these loops to silence the rule is a step backwards, not a cleanup.

Everything else oxlint reported was fixed rather than silenced — four
`consistent-function-scoping` findings became hoisted module-level helpers. If you
find yourself reaching for a third suppression, prefer changing the code.

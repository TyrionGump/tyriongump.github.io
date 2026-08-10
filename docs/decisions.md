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

## The scrollbar's transparency fade is not ported

The design animates `scrollbar-color` every frame while scrolling. It is
undocumented, and
it largely duplicates what macOS overlay scrollbars already do on their own.

---

## Toolchain

**Node 24.** `.nvmrc` pins it and the deploy workflow reads that file, so 24 is
the only version this project is actually tested on. The `engines` field says
`>=20.19`, which is the floor the dependencies need — not a target. If you use
nvm, note that its lazy shell shim does not load in non-interactive shells, so
scripts and editors may find whatever `node` is on the bare `PATH` instead. A
`v16` on `PATH` fails on this toolchain in ways that do not name the cause.

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
claim in prose; now `animation/` reaching into `content/` fails CI with a message
naming the rule it broke. `import/no-unassigned-import` is the single `"off"`,
because `main.ts` imports the stylesheet for its side effect and that is correct.

Three things to know before editing those overrides:

- **oxlint's regex has no lookahead or lookbehind** (it is the Rust `regex`
  crate). "Everything under `src/` except these two" cannot be written directly,
  which is why the `build/` rule names the directories it forbids rather than the
  ones it allows. Add a new forbidden path when you add a new layer.
- **Patterns must tolerate every spelling of the same import.** `../animation/`
  and `../../src/animation/` reach the same module; a pattern anchored only to
  `\.\./animation/` misses the second and the boundary silently has a hole. The
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
src/animation/type-into-element.ts                      no-await-in-loop
src/components/work-git-graph/graph-draw-sequence.ts    no-await-in-loop
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

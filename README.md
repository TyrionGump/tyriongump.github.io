# tyriongump.github.io

A personal site built around one idea: the whole thing behaves like a terminal
session. Home is a shell window that types `whoami` and answers itself, Work is a
`git log --graph` whose commits are the projects, and a console overlay takes
real commands from anywhere.

Vite + TypeScript 7, no UI framework. pnpm, oxlint, oxfmt, Vitest, Playwright.

```bash
pnpm install
pnpm exec playwright install chromium # once: the browser for browser tests
pnpm dev # dev server
pnpm check # typecheck, lint, format, test, build, browser tests — what CI runs
```

Node 24, pinned by `.nvmrc`, which is also what CI reads.

---

## ⚠ The content is placeholder

Every project — ledger, harbor, prism, sift — is **invented**, metrics and commit
hashes included. `andrew@example.com` is not a real address.

This is a portfolio with "open to work" on it. Replace the records in
[`src/content/projects.ts`](src/content/projects.ts) before publishing.

---

## Deploying

Push to `main`. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
type-checks, tests, builds and publishes `dist/`.

**One manual step first:** Settings → Pages → Build and deployment → Source →
**GitHub Actions**. Nothing deploys until that is set.

---

## Docs

- [architecture.md](docs/architecture.md) — the prerender pipeline, the
  `render-*` / `mount-*` split, layout and import rules, theming, adding a route.
- [decisions.md](docs/decisions.md) — why there is no framework, why the fonts
  are self-hosted, what was deliberately left unbuilt, and the toolchain.

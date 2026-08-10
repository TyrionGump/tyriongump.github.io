import { defineConfig } from "vite";

import { prerenderContentPlugin } from "./build/prerender-content-plugin";
import { renderConsoleOverlay } from "./src/components/console-overlay/render-console-overlay";
import { renderHomePage } from "./src/components/home-terminal-panel/render-home-terminal-panel";
import { renderPersonalPage } from "./src/components/personal-page/render-personal-page";
import { renderScrollProgressRing } from "./src/components/scroll-progress-ring/render-scroll-progress-ring";
import { renderSiteNavigation } from "./src/components/site-navigation/render-site-navigation";
import { renderWorkPage } from "./src/components/work-git-graph/render-work-git-graph";

export default defineConfig({
  // Deployed at the root of a GitHub Pages user site (tyriongump.github.io).
  base: "/",

  plugins: [
    /**
     * The full map of what gets baked into `index.html` and where. Each key
     * matches a `<!--prerender:key-->` slot in the document; a mismatch either
     * way fails the build — and the dev-server request — rather than shipping a
     * hole.
     *
     * Two naming systems meet at these keys. The three **route** slots are
     * `<route>-page`, where `<route>` is a `RouteName`; the three slots for the
     * nav and the two overlays are named for their component and take no
     * suffix. So a key is not simply the module name: the shell-session theme
     * owns directory and file names (`home-terminal-panel`), while the route
     * owns the slot key (`home-page`),
     * the `<section id>`, `data-page`, and the `pageMounters` key in `main.ts`.
     *
     * This file is a config dependency, so editing anything reachable from it —
     * including `src/content` — restarts the dev server rather than hot-reloading.
     */
    prerenderContentPlugin({
      "site-navigation": renderSiteNavigation,
      "home-page": renderHomePage,
      "work-page": renderWorkPage,
      "personal-page": renderPersonalPage,
      "console-overlay": renderConsoleOverlay,
      "scroll-progress-ring": renderScrollProgressRing,
    }),
  ],

  build: {
    target: "es2022",
  },
});

import { defineConfig } from "vite";

import { prerenderContentPlugin } from "./build/prerender-content-plugin";
import { renderConsoleOverlay } from "./src/chrome/console/render-console-overlay";
import { renderHomePage } from "./src/pages/home/render-home-page";
import { renderPersonalPage } from "./src/pages/personal/render-personal-page";
import { renderScrollProgressRing } from "./src/chrome/scroll-ring/render-scroll-progress-ring";
import { renderSiteNavigation } from "./src/chrome/navigation/render-site-navigation";
import { renderWorkPage } from "./src/pages/work/render-work-page";

export default defineConfig({
  // Deployed at the root of a GitHub Pages user site (tyriongump.github.io).
  base: "/",

  plugins: [
    // Each key fills the `<!--prerender:key-->` slot of the same name in index.html.
    // Editing anything this file imports, including src/content, restarts the dev server.
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

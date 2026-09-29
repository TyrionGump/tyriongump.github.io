import { defineConfig } from "vite";

import { prerenderContentPlugin } from "./build/prerender-content-plugin";
import { renderPageBody, renderPageHead } from "./src/render-page-document";
import { sitePages } from "./src/site-pages";

const htmlFileFor = (path: string): string => `${path.slice(1)}index.html`;

export default defineConfig({
  // One HTML file per page, and no fallback to Home for unknown paths.
  appType: "mpa",

  // Editing anything this file imports, including src/content, restarts the dev server.
  plugins: [prerenderContentPlugin({ head: renderPageHead, body: renderPageBody })],

  build: {
    target: "es2022",
    rollupOptions: {
      input: [...sitePages.map((page) => htmlFileFor(page.path)), "404.html"],
    },
  },
});

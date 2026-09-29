import { defineConfig } from "@playwright/test";

const port = 4173;

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: true,

  use: {
    baseURL: `http://localhost:${port}`,
    // Skips the typing animations, so tests see the final state at once.
    reducedMotion: "reduce",
  },

  webServer: {
    // Builds first, so the tests never run against a stale dist/.
    command: `vite build && vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
  },
});

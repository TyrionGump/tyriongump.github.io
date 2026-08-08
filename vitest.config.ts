import { defineConfig } from "vitest/config";

/**
 * Separate from `vite.config.ts` on purpose: that config wires the prerender
 * plugin, which exists to transform `index.html` and has nothing to say about
 * unit tests.
 *
 * Everything tested here is pure — string in, string out — so the tests run in
 * Node with no DOM. That is not a limitation; it is the point of splitting
 * `render-*` (pure) from `mount-*` (DOM). The behaviour that does need a browser
 * is verified in one.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],

    // Without this vitest resolves CSS to an empty module, and `?raw` does not
    // escape that: `index.css?raw` reads as `''`. The cascade-manifest guard in
    // `prerendered-output.test.ts` then fails with a confusing empty-array
    // mismatch rather than a missing stylesheet. It fails loudly either way —
    // this flag is what makes the failure legible.
    css: true,
  },
});

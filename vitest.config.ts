import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],

    // Without this, `index.css?raw` reads as `''`, and the cascade test in
    // `prerendered-output.test.ts` fails with a confusing empty-array mismatch.
    css: true,
  },
});

import { describe, expect, it } from "vitest";

/**
 * Classes belong to CSS and `data-*` attributes belong to script, so a class can
 * be renamed for styling without breaking behaviour.
 */
const sources = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const classLookup =
  /(?:requireElement|findElement|findAllElements|querySelector(?:All)?|closest)(?:<[^>]*>)?\([^)]*["'`]\./;
const classCheck = /classList\.contains\(/;

describe("script hooks", () => {
  it("never finds or tests an element by class", () => {
    const offenders = Object.entries(sources).flatMap(([path, source]) =>
      source
        .split("\n")
        .map((line, index) => ({ line, at: `${path}:${index + 1}` }))
        .filter(({ line }) => classLookup.test(line) || classCheck.test(line))
        .map(({ at, line }) => `${at}  ${line.trim()}`),
    );
    expect(offenders).toEqual([]);
  });
});

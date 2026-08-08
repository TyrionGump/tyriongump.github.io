/**
 * Hash parsing has to be total: the hash is user-editable, so every possible
 * string needs an answer. The CSS fallback rule in `site-layout.css`
 * (`html:not(:has(.site-page:target))`) assumes the same "anything unrecognised
 * means home" behaviour — if these two ever disagree, the page shown before the
 * bundle loads differs from the one shown after.
 */

import { describe, expect, it } from "vitest";

import { defaultRouteName, isRouteName, readRouteNameFromHash, routeNames } from "./route-names";

describe("readRouteNameFromHash", () => {
  it("reads each real route", () => {
    for (const route of routeNames) {
      expect(readRouteNameFromHash(`#${route}`)).toBe(route);
    }
  });

  it("accepts a hash with no leading marker", () => {
    expect(readRouteNameFromHash("work")).toBe("work");
  });

  it("falls back to home for an empty hash", () => {
    expect(readRouteNameFromHash("")).toBe(defaultRouteName);
    expect(readRouteNameFromHash("#")).toBe(defaultRouteName);
  });

  it("falls back to home for anything unrecognised", () => {
    expect(readRouteNameFromHash("#nonsense")).toBe(defaultRouteName);
    expect(readRouteNameFromHash("#work/extra")).toBe(defaultRouteName);
    expect(readRouteNameFromHash("#Work")).toBe(defaultRouteName);
  });

  it("does not fall through to an inherited object property", () => {
    // `routeNames.includes` rather than `key in map` — otherwise "constructor"
    // and "toString" would both be valid routes.
    expect(readRouteNameFromHash("#constructor")).toBe(defaultRouteName);
    expect(readRouteNameFromHash("#toString")).toBe(defaultRouteName);
    expect(readRouteNameFromHash("#__proto__")).toBe(defaultRouteName);
  });
});

describe("isRouteName", () => {
  it("accepts real routes and rejects everything else", () => {
    expect(isRouteName("home")).toBe(true);
    expect(isRouteName("personal")).toBe(true);
    expect(isRouteName("nope")).toBe(false);
    expect(isRouteName("constructor")).toBe(false);
  });
});

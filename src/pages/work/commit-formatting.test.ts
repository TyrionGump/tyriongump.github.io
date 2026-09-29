/**
 * These functions are shared between the markup (which bakes final values into
 * the HTML at build time) and the count-up animation (which walks up to them).
 * If they ever disagree, the last frame of every count-up visibly snaps to a
 * different string — so the contract is worth pinning down.
 */

import { describe, expect, it } from "vitest";

import { buildStatBars, formatLineCount, formatMetricValue } from "./commit-formatting";

describe("formatMetricValue", () => {
  it("gives percentages two decimals", () => {
    expect(formatMetricValue(99.99, "%")).toBe("99.99%");
    expect(formatMetricValue(99.9, "%")).toBe("99.90%");
  });

  it("groups thousands", () => {
    expect(formatMetricValue(12000, "")).toBe("12,000");
  });

  it("leaves values under a thousand ungrouped", () => {
    expect(formatMetricValue(999, "")).toBe("999");
    expect(formatMetricValue(840, "ms")).toBe("840ms");
  });

  it("renders zero, which is a real metric here", () => {
    expect(formatMetricValue(0, "")).toBe("0");
  });

  it("rounds intermediate count-up values so digits never flicker mid-animation", () => {
    expect(formatMetricValue(11999.6, "")).toBe("12,000");
  });

  it("agrees at the target value regardless of how it was reached", () => {
    // What the markup bakes, and what the last animation frame produces.
    expect(formatMetricValue(4000, "")).toBe(formatMetricValue(4000 * 1, ""));
  });
});

describe("formatLineCount", () => {
  it("groups thousands with a pinned locale, so Node and the browser agree", () => {
    expect(formatLineCount(12400)).toBe("12,400");
    expect(formatLineCount(940)).toBe("940");
  });
});

describe("buildStatBars", () => {
  it("always totals the full bar width", () => {
    const bars = buildStatBars(12400, 3180);
    expect(bars.added.length + bars.removed.length).toBe(22);
  });

  it("splits roughly in proportion to the change", () => {
    const bars = buildStatBars(12400, 3180);
    expect(bars.added.length).toBe(18);
    expect(bars.removed.length).toBe(4);
  });

  it("always shows at least one added block, so a deletion still reads as a ratio", () => {
    const bars = buildStatBars(1, 100000);
    expect(bars.added.length).toBe(1);
    expect(bars.removed.length).toBe(21);
  });

  it("survives a commit that changed nothing rather than dividing by zero", () => {
    const bars = buildStatBars(0, 0);
    expect(bars.added.length + bars.removed.length).toBe(22);
    expect(bars.added.length).toBe(1);
  });
});

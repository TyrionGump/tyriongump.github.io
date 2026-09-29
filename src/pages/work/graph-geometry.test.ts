/**
 * The graph's whole character comes from one property: every stroke moves at the
 * same speed, so the drawing reads as a pen travelling rather than as segments
 * springing into place. That property lives in `strokeDurationMs`, and it is
 * invisible in a screenshot — a graph drawn at inconsistent speeds looks fine in
 * a still and wrong in motion. Worth a test.
 */

import { describe, expect, it } from "vitest";

import {
  branchCurveStartY,
  buildBranchCurvePath,
  buildTrunkPath,
  graphGeometry,
  strokeDurationMs,
} from "./graph-geometry";

describe("strokeDurationMs", () => {
  it("is length divided by the pen speed", () => {
    // The exact values observed in the running page.
    expect(strokeDurationMs(229)).toBe(498);
    expect(strokeDurationMs(42)).toBe(91);
    expect(strokeDurationMs(323)).toBe(702);
  });

  it("holds one constant speed across wildly different lengths", () => {
    const speeds = [60, 120, 240, 480, 700].map((length) => length / strokeDurationMs(length));
    for (const speed of speeds) {
      expect(speed).toBeCloseTo(graphGeometry.penSpeedPxPerMs, 2);
    }
  });

  it("times the corner by its arc length, so the bend does not crawl", () => {
    // A vertical of the same travel takes the same time as the curve.
    const curveMs = Math.round(graphGeometry.curvePathLength / graphGeometry.penSpeedPxPerMs);
    expect(strokeDurationMs(graphGeometry.curvePathLength)).toBe(curveMs);
  });

  it("clamps a very short stroke so it still reads as a stroke, not a blink", () => {
    expect(strokeDurationMs(1)).toBe(graphGeometry.minimumStrokeDurationMs);
  });

  it("clamps a very long stroke so a tall row does not stall the sequence", () => {
    expect(strokeDurationMs(100000)).toBe(graphGeometry.maximumStrokeDurationMs);
  });
});

describe("path builders", () => {
  it("runs the trunk far enough to outlast any row height", () => {
    expect(buildTrunkPath()).toBe(`M 13 0 V ${graphGeometry.trunkPathLength}`);
    expect(graphGeometry.trunkPathLength).toBeGreaterThan(3000);
  });

  it("leaves the trunk vertically before bending, so the branch grows out of it", () => {
    // The first control point shares the start's x: that is what makes the
    // departure tangential rather than a diagonal stuck onto the trunk.
    const path = buildBranchCurvePath();
    const startX = graphGeometry.trunkX + 1;
    const expectedPrefix = `M ${startX} ${branchCurveStartY} C ${startX} `;
    expect(path.slice(0, expectedPrefix.length)).toBe(expectedPrefix);
  });

  it("lands the branch exactly on its node", () => {
    const expectedEnding = `${graphGeometry.branchX + 1} ${graphGeometry.branchPeelY}`;
    expect(buildBranchCurvePath().slice(-expectedEnding.length)).toBe(expectedEnding);
  });
});

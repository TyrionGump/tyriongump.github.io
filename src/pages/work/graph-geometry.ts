// Used by the build-time markup and by the browser draw code, so no DOM.

export const graphGeometry = {
  trunkX: 12,
  branchX: 44,
  headNodeY: 10,
  /** Where the branch curve ends and its node sits. */
  branchPeelY: 38,
  rootNodeY: 42,
  railWidth: 2,
  rowBottomPadding: 56,
  nodeSize: 11,

  penSpeedPxPerMs: 0.46,

  /** The trunk is a dash re-cut to each row's height, so this must exceed any row height. */
  trunkPathLength: 4000,

  /** Measured arc length of the branch curve. Update it if the curve changes. */
  curvePathLength: 45,

  maximumStrokeDurationMs: 1700,
  minimumStrokeDurationMs: 40,
} as const;

export const branchCurveStartY = graphGeometry.branchPeelY - 26;

export function buildTrunkPath(): string {
  return `M ${graphGeometry.trunkX + 1} 0 V ${graphGeometry.trunkPathLength}`;
}

/** The first control point sits directly below the start, so the curve leaves the trunk vertically. */
export function buildBranchCurvePath(): string {
  const startX = graphGeometry.trunkX + 1;
  const endX = graphGeometry.branchX + 1;
  const startY = branchCurveStartY;
  return (
    `M ${startX} ${startY} ` +
    `C ${startX} ${startY + 14} ${graphGeometry.branchX - 13} ${graphGeometry.branchPeelY} ` +
    `${endX} ${graphGeometry.branchPeelY}`
  );
}

export function strokeDurationMs(lengthPx: number): number {
  return Math.max(
    graphGeometry.minimumStrokeDurationMs,
    Math.min(
      graphGeometry.maximumStrokeDurationMs,
      Math.round(lengthPx / graphGeometry.penSpeedPxPerMs),
    ),
  );
}

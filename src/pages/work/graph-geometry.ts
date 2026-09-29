/**
 * The git graph's geometry, in one place.
 *
 * Every value is exact and comes from the design. They are grouped here rather
 * than scattered through the markup and the draw code because the graph is a
 * drawing: changing one number without the others produces a rail that misses
 * its node by two pixels, which is the kind of bug you see but cannot name.
 *
 * Note `gutterWidth` is the same 74px prompt gutter the terminal lines use on
 * Work and Personal. The graph draws its rails inside it, which is what makes
 * the graph and the shell session read as one surface. Changing it means
 * changing it on both pages together.
 *
 * Imported by `render-work-git-graph`, so this runs in Node at build time, and by
 * `graph-draw-sequence`, so it runs in the browser too. No DOM on either path.
 */

export const graphGeometry = {
  /** The prompt gutter the whole graph is drawn inside. */
  gutterWidth: 74,
  /** Horizontal position of the trunk (`main`). */
  trunkX: 12,
  /** Horizontal position of a branch once it has peeled away. */
  branchX: 44,
  /** Vertical position of the HEAD node. */
  headNodeY: 10,
  /** Where a branch has finished peeling and its node sits. */
  branchPeelY: 38,
  /** Vertical position of the root commit's node. */
  rootNodeY: 42,
  /** Rail stroke width. */
  railWidth: 2,
  /** Breathing room under a commit row's content. */
  rowBottomPadding: 56,
  /** Node diameter. */
  nodeSize: 11,

  /**
   * The pen's speed, in px per millisecond — one constant rate for the whole
   * drawing. This is what makes it read as drawing rather than as segments
   * springing into place.
   */
  penSpeedPxPerMs: 0.46,

  /**
   * The trunk is drawn as a fixed-length dash that gets re-cut, rather than a
   * scaled box, so it can stop part-way and resume without showing a seam. The
   * length just has to exceed any row height the content can produce.
   */
  trunkPathLength: 4000,

  /**
   * The corner's own arc length. Measuring it means the curve travels at the
   * same rate as a vertical instead of crawling through the bend.
   */
  curvePathLength: 45,

  /** Longest a single stroke may take, however tall its row grows. */
  maximumStrokeDurationMs: 1700,
  /** Shortest, so a tiny row still reads as a stroke rather than a blink. */
  minimumStrokeDurationMs: 40,
} as const;

/** Where the branch starts bending away from the trunk. */
export const branchCurveStartY = graphGeometry.branchPeelY - 26;

/** The trunk running the full height of a commit row. */
export function buildTrunkPath(): string {
  return `M ${graphGeometry.trunkX + 1} 0 V ${graphGeometry.trunkPathLength}`;
}

/**
 * The branch peeling off the trunk.
 *
 * The first control point sits directly below the start, so the curve leaves
 * *vertically* and only then bends away — the branch grows out of the trunk
 * instead of being stuck on at an angle. Trunk and branch share one `<g>` at a
 * single opacity, so nothing brightens where they overlap.
 */
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

/** How long a stroke of `lengthPx` takes at the pen's constant speed. */
export function strokeDurationMs(lengthPx: number): number {
  return Math.max(
    graphGeometry.minimumStrokeDurationMs,
    Math.min(
      graphGeometry.maximumStrokeDurationMs,
      Math.round(lengthPx / graphGeometry.penSpeedPxPerMs),
    ),
  );
}

/**
 * The project records — one source for both the Work graph and the Personal
 * page, so the rich record and the commit line cannot drift apart.
 *
 * ⚠ PLACEHOLDER CONTENT. Every project below is invented, including the metrics
 * ("12,000 writes / second", "99.99% uptime, 2 years") and the commit hashes.
 * They exist to prove the layout. This is a portfolio with "open to work" on it
 * — replace them with real work before the site is published.
 */

export const projectIds = ["ledger", "harbor", "prism", "sift"] as const;

export type ProjectId = (typeof projectIds)[number];

export interface ProjectMetric {
  readonly value: number;
  /** Rendered straight after the value: '%', 'ms', 'TB', or nothing. */
  readonly suffix: string;
  readonly label: string;
}

export interface ProjectStorySection {
  readonly label: string;
  readonly body: string;
}

/**
 * The parts of a project that exist because it is being told as a git commit.
 *
 * The collapsed head renders "hash · ref · year". The design also specifies a
 * subject and a relative date; both are omitted here rather than carried unused
 * — add them back alongside a renderer if you want them.
 */
export interface ProjectCommit {
  readonly hash: string;
  readonly linesAdded: number;
  readonly linesRemoved: number;
  readonly filesChanged: number;
}

export interface Project {
  readonly id: ProjectId;
  readonly name: string;
  readonly year: string;
  readonly category: string;
  /** One line, capped at 58ch on screen. */
  readonly oneLiner: string;
  /** Short description used by the Personal page's project list. */
  readonly shortDescription: string;
  /** Longer answer given by the console's `open <project>` command. */
  readonly shellDescription: string;
  readonly role: readonly string[];
  readonly stack: readonly string[];
  readonly metrics: readonly ProjectMetric[];
  readonly story: readonly ProjectStorySection[];
  readonly sourceCode: string;
  readonly consoleOutput: readonly string[];
  readonly commit: ProjectCommit;
}

export const projects: Readonly<Record<ProjectId, Project>> = {
  ledger: {
    id: "ledger",
    name: "Ledger",
    year: "2026",
    category: "Payments infrastructure",
    oneLiner: "Moves money between banks without ever losing a cent.",
    shortDescription: "distributed txn engine",
    shellDescription:
      "Twelve thousand transactions a second across three continents, with a guarantee that nothing is ever counted twice.",
    role: ["Backend lead", "3 engineers", "14 months"],
    stack: ["Go", "Raft", "Postgres", "gRPC"],
    metrics: [
      { value: 12000, suffix: "", label: "writes / second" },
      { value: 3, suffix: "", label: "regions, active-active" },
      { value: 99.99, suffix: "%", label: "uptime, 2 years" },
    ],
    story: [
      {
        label: "The problem",
        body: "Two banks, one transfer, and a network that fails halfway. The money must never be counted twice and must never disappear — even when a whole region goes dark mid-write.",
      },
      {
        label: "What it took",
        body: "Raft consensus across three continents, a write-ahead log written by hand rather than borrowed, and batching tuned over months until the p99 stopped moving.",
      },
    ],
    sourceCode: `/** ledger — distributed transaction engine */

export const ledger: System = {
  problem: "Money must move between banks, and never be lost.",
  scale:   { writes: "12k/sec", regions: 3, dataLoss: 0 },
  built:   ["Go", "Raft", "Postgres"],
  year:    2026,
};

async function settle(tx: Transfer): Promise<Receipt> {
  const quorum = await raft.propose(tx);
  return wal.commit(quorum);
}`,
    consoleOutput: [
      "› node ledger.ts",
      "Moves money between banks without ever losing a cent —",
      "twelve thousand times a second, across three continents.",
      "✓ uptime 99.99%   ·   zero data loss since launch",
    ],
    commit: {
      hash: "a3f9c21",
      linesAdded: 12400,
      linesRemoved: 3180,
      filesChanged: 87,
    },
  },

  harbor: {
    id: "harbor",
    name: "Harbor",
    year: "2025",
    category: "Fleet orchestration",
    oneLiner: "Keeps four thousand machines up to date — signal or not.",
    shortDescription: "edge orchestration",
    shellDescription:
      "Software updates for four thousand machines on connections that drop constantly. Every rollout is resumable.",
    role: ["Sole engineer", "Platform team", "9 months"],
    stack: ["Rust", "Kubernetes", "gRPC", "Terraform"],
    metrics: [
      { value: 4000, suffix: "", label: "edge nodes managed" },
      { value: 0, suffix: "", label: "rollouts ever lost" },
      { value: 99.94, suffix: "%", label: "fleet availability" },
    ],
    story: [
      {
        label: "The problem",
        body: "Four thousand machines in warehouses and trucks, on connections that drop without warning. A half-applied update on a machine you cannot reach is an on-site visit.",
      },
      {
        label: "What it took",
        body: "Every rollout made resumable and idempotent, with state reconciled from the node rather than assumed by the server. A deploy can die at any byte and pick up exactly where it stopped.",
      },
    ],
    sourceCode: `/** harbor — edge orchestration */

export const harbor: System = {
  problem: "4,000 machines to update. Half are offline.",
  scale:   { nodes: 4000, rollouts: "resumable", lost: 0 },
  built:   ["Rust", "Kubernetes"],
  year:    2025,
};

async function reconcile(node: Node): Promise<Plan> {
  const actual = await node.report();
  return diff(actual, desired).resumable();
}`,
    consoleOutput: [
      "› node harbor.ts",
      "Keeps four thousand machines up to date — including the",
      "ones that keep losing signal halfway through.",
      "✓ uptime 99.94%   ·   zero rollouts lost",
    ],
    commit: {
      hash: "7b2e40d",
      linesAdded: 8720,
      linesRemoved: 5140,
      filesChanged: 46,
    },
  },

  prism: {
    id: "prism",
    name: "Prism",
    year: "2024",
    category: "Realtime collaboration",
    oneLiner: "Sixty people in one document, and nobody overwrites anybody.",
    shortDescription: "crdt collab editor",
    shellDescription:
      "Sixty people editing one document at once, on a conflict-free data structure written from scratch.",
    role: ["Frontend + core", "2 engineers", "11 months"],
    stack: ["TypeScript", "WASM", "CRDT", "React"],
    metrics: [
      { value: 60, suffix: "", label: "concurrent cursors" },
      { value: 0, suffix: "", label: "merge conflicts" },
      { value: 18, suffix: "ms", label: "median keystroke echo" },
    ],
    story: [
      {
        label: "The problem",
        body: "Real-time editing usually means a server deciding who wins. That server is a single point of failure, a latency floor, and the reason your cursor jumps when the wifi hiccups.",
      },
      {
        label: "What it took",
        body: "A conflict-free replicated data type written from scratch and compiled to WASM, so every client converges on the same document with no referee and no lost keystrokes.",
      },
    ],
    sourceCode: `/** prism — realtime collaboration */

export const prism: System = {
  problem: "Sixty people editing one document at once.",
  scale:   { cursors: 60, conflicts: 0, server: "none" },
  built:   ["TypeScript", "WASM"],
  year:    2024,
};

function merge(local: Doc, remote: Op[]): Doc {
  return remote.reduce(apply, local);
}`,
    consoleOutput: [
      "› node prism.ts",
      "Lets sixty people edit the same document at once without",
      "anyone ever overwriting anyone else.",
      "✓ conflicts 0%   ·   no server arbitration",
    ],
    commit: {
      hash: "e1c8f55",
      linesAdded: 15300,
      linesRemoved: 2260,
      filesChanged: 112,
    },
  },

  sift: {
    id: "sift",
    name: "Sift",
    year: "2023",
    category: "Search at scale",
    oneLiner: "Finds one line inside forty terabytes, in under a second.",
    shortDescription: "log search",
    shellDescription:
      "Search across forty terabytes of logs that returns before you finish reading the question.",
    role: ["Backend", "2 engineers", "7 months"],
    stack: ["Go", "Lucene", "S3", "Redis"],
    metrics: [
      { value: 40, suffix: "TB", label: "log corpus searched" },
      { value: 840, suffix: "ms", label: "p95 query latency" },
      { value: 3, suffix: "", label: "storage tiers" },
    ],
    story: [
      {
        label: "The problem",
        body: "When production breaks at 3am, the answer is somewhere in forty terabytes of logs. A search that takes two minutes is a search nobody runs.",
      },
      {
        label: "What it took",
        body: "An inverted index over tiered storage — hot in memory, warm on disk, cold in object storage — and a query planner that knows when to stop early rather than scan everything.",
      },
    ],
    sourceCode: `/** sift — log search at scale */

export const sift: System = {
  problem: "Find one line inside forty terabytes of logs.",
  scale:   { corpus: "40TB", p95: "840ms", tiers: 3 },
  built:   ["Go", "Lucene"],
  year:    2023,
};

function plan(q: Query): Scan {
  return tiers.filter(t => t.mayMatch(q)).earlyExit();
}`,
    consoleOutput: [
      "› node sift.ts",
      "Finds one line inside forty terabytes of logs, and does it",
      "in under a second.",
      "✓ p95 840ms   ·   99.98% uptime",
    ],
    commit: {
      hash: "4d90ba7",
      linesAdded: 6480,
      linesRemoved: 940,
      filesChanged: 31,
    },
  },
};

/**
 * The graph deliberately shows only the two most recent commits. The others are
 * real records that appear on the Personal page — a `git log` that scrolled
 * forever would bury the point.
 */
export const workGraphProjectIds = ["ledger", "harbor"] as const satisfies readonly ProjectId[];

/** Newest first, for the Personal page's index. */
export const projectsNewestFirst: readonly Project[] = projectIds.map((id) => projects[id]);

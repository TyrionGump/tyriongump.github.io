/**
 * Who the site is about. Every component reads its copy from here rather than
 * hardcoding it, so changing the email address is one edit rather than six.
 *
 * ⚠ PLACEHOLDER CONTENT, not yet real:
 *   - `emailAddress` is a stand-in and must be replaced before launch.
 *   - The project records behind Work and Personal (ledger, harbor, prism,
 *     sift) are invented, metrics included. Replace them with real work before
 *     this site is published.
 */

export const siteIdentity = {
  /** Lowercase, as it appears in the nav logo and terminal prompts. */
  handle: "andrew",
  displayName: "Andrew",
  role: "software engineer",
  location: "Melbourne, AU",
  /** Time zone name for the terminal panel clock, as `Region/City`. */
  timeZone: "Australia/Melbourne",
  availability: "open to work",
  githubUrl: "https://github.com/TyrionGump",
  githubLabel: "github.com/TyrionGump",
  emailAddress: "andrew@example.com",
} as const;

/** Answer to the console's `stack` command. Lowercase — it is shell output. */
export const technologies = [
  "go",
  "rust",
  "typescript",
  "postgres",
  "kafka",
  "k8s",
  "terraform",
] as const;

export const siteMetadata = {
  title: "Andrew — Software Engineer",
  description:
    "Andrew builds software end to end — the database underneath, the API in the middle, " +
    "and the screen you actually use. Melbourne, AU.",
} as const;

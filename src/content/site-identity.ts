// ⚠ PLACEHOLDER CONTENT: `emailAddress` is a stand-in. Replace it before launch.

export const siteIdentity = {
  /** Lowercase: it appears in the nav logo and terminal prompts. */
  handle: "andrew",
  displayName: "Andrew",
  role: "software engineer",
  location: "Melbourne, AU",
  /** IANA zone name for the terminal clock. */
  timeZone: "Australia/Melbourne",
  availability: "open to work",
  githubUrl: "https://github.com/TyrionGump",
  githubLabel: "github.com/TyrionGump",
  emailAddress: "andrew@example.com",
} as const;

/** Printed by the console's `stack` command, so keep it lowercase. */
export const technologies = [
  "go",
  "rust",
  "typescript",
  "postgres",
  "kafka",
  "k8s",
  "terraform",
] as const;

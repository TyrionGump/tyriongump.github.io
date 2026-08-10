/**
 * The Home page's shell session, as data.
 *
 * A line declares only what it *is* (`greeting`, `body`, `status`); the
 * stylesheet decides how that looks. Resizing the text is one CSS edit rather
 * than a hunt through content.
 */

import type { RouteName } from "../routing/route-names";

/** Which type role a terminal output line plays. Maps 1:1 to a CSS class. */
export type TerminalLineRole = "greeting" | "body" | "status";

export type TerminalOutputLine =
  | { readonly kind: "blank-line" }
  | { readonly kind: "text"; readonly role: TerminalLineRole; readonly text: string };

export interface HomeMenuItem {
  readonly route: RouteName;
  readonly label: string;
  readonly description: string;
}

/** The command the visitor watches being typed first. */
export const homeIntroCommand = "whoami";

/**
 * `whoami`'s answer. Rendered all at once on a single fade, never staggered
 * line by line — a real shell returns its output in one beat, and staggering
 * reads as decoration rather than as a terminal.
 */
export const homeIntroOutput: readonly TerminalOutputLine[] = [
  { kind: "blank-line" },
  { kind: "text", role: "greeting", text: "Hi, I'm Andrew." },
  { kind: "text", role: "body", text: "I build software end to end — the database underneath," },
  { kind: "text", role: "body", text: "the API in the middle, and the screen you actually use." },
  { kind: "blank-line" },
  { kind: "text", role: "status", text: "Melbourne, AU · open to work" },
];

/**
 * The second command. `open` with no argument, so the shell has to ask which —
 * a real shell pattern, and a menu waits for you in a way a greyed-out hint
 * never does.
 */
export const homeMenuCommand = "open";

export const homeMenuPrompt = "where to next";

export const homeMenuItems: readonly HomeMenuItem[] = [
  { route: "work", label: "work", description: "four systems, all still running" },
  { route: "personal", label: "personal", description: "notes, experiments, a live shell" },
];

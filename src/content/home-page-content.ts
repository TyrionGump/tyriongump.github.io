import type { RouteName } from "../site-pages";
import { siteIdentity } from "./site-identity";

/** Each role is also a CSS class name. */
export type TerminalLineRole = "greeting" | "body" | "status";

export type TerminalOutputLine =
  | { readonly kind: "blank-line" }
  | { readonly kind: "text"; readonly role: TerminalLineRole; readonly text: string };

export const homeIntroCommand = "whoami";

export const homeIntroOutput: readonly TerminalOutputLine[] = [
  { kind: "blank-line" },
  { kind: "text", role: "greeting", text: `Hi, I'm ${siteIdentity.displayName}.` },
  { kind: "text", role: "body", text: "I build software end to end — the database underneath," },
  { kind: "text", role: "body", text: "the API in the middle, and the screen you actually use." },
  { kind: "blank-line" },
  {
    kind: "text",
    role: "status",
    text: `${siteIdentity.location} · ${siteIdentity.availability}`,
  },
];

export const homeMenuCommand = "open";

export const homeMenuPrompt = "where to next";

export const homeMenuDescriptions: Readonly<Record<Exclude<RouteName, "home">, string>> = {
  work: "two systems, both still running",
  personal: "notes, experiments, a live shell",
};

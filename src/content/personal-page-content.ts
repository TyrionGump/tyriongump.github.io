/**
 * The Personal page's copy — the human half of the site.
 *
 * The bio is modelled as runs of text rather than one string because one word
 * in it ("terminal") is a control that opens the console. Keeping that as
 * structure means the content file never has to contain markup, and the
 * renderer never has to search prose for a magic word.
 */

import { siteIdentity } from "./site-identity";

export interface ProseRun {
  readonly text: string;
  /** Renders as the dotted-underline trigger that summons the console. */
  readonly opensConsole?: true;
}

export const personalHero = "I’d rather delete code than add it.";

export const personalByline = `${siteIdentity.handle} · ${siteIdentity.role} · melbourne, au`;

export const personalBioLead =
  "I started on backends and kept following problems until I’d touched every layer.";

export const personalBioParagraphs: readonly (readonly ProseRun[])[] = [
  [
    {
      text: "Now I take a feature from database schema to the pixel someone clicks. I’m most useful early, when nobody is sure how the thing should work yet — the part where you throw away three designs before the fourth one is obvious.",
    },
  ],
  [
    { text: "Outside of work I read too much about databases, and I keep a " },
    { text: "terminal", opensConsole: true },
    { text: " open on a second monitor for no defensible reason." },
  ],
];

export interface NowEntry {
  readonly label: string;
  readonly value: string;
  /** Rendered in the status green, like the prompt glyph. */
  readonly isStatus?: true;
}

export const nowEntries: readonly NowEntry[] = [
  { label: "based", value: siteIdentity.location },
  { label: "daily", value: "Go, Rust, TypeScript" },
  { label: "learning", value: "Distributed clocks" },
  { label: "status", value: "Open to work", isStatus: true },
];

export const contactStatement =
  "Open to interesting problems and teams that care about the details. I usually reply the same day.";

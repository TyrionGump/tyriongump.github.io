// The bio is split into segments so one word ("terminal") can open the console
// without putting markup in the copy.

import { siteIdentity } from "./site-identity";

export interface ProseSegment {
  readonly text: string;
  readonly opensConsole?: true;
}

export const personalHero = "I’d rather delete code than add it.";

export const personalByline = `${siteIdentity.handle} · ${siteIdentity.role} · ${siteIdentity.location.toLowerCase()}`;

export const personalBioLead =
  "I started on backends and kept following problems until I’d touched every layer.";

export const personalBioParagraphs: readonly (readonly ProseSegment[])[] = [
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
  readonly isStatus?: true;
}

export const nowEntries: readonly NowEntry[] = [
  { label: "based", value: siteIdentity.location },
  { label: "daily", value: "Go, Rust, TypeScript" },
  { label: "learning", value: "Distributed clocks" },
  {
    label: "status",
    value: siteIdentity.availability.charAt(0).toUpperCase() + siteIdentity.availability.slice(1),
    isStatus: true,
  },
];

export const contactStatement =
  "Open to interesting problems and teams that care about the details. I usually reply the same day.";

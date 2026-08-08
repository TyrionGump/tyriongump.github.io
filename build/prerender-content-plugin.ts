/**
 * Bakes rendered content into `index.html` at build time.
 *
 * This is what lets content live in one place (typed modules under `src/content`)
 * while still shipping as real HTML. `index.html` marks slots with
 * `<!--prerender:name-->` comments, and this plugin swaps each for the markup its
 * renderer produces.
 *
 * The alternative — rendering pages from script on load — would mean the served
 * document is an empty div, which costs the page its crawlable content and gives
 * anyone on a slow connection a blank screen while the bundle arrives.
 *
 * Renderers must be pure string functions with no DOM access, since they run
 * here in Node.
 */

import type { Plugin } from "vite";

import { renderFragmentToMarkup, type HtmlFragment } from "../src/shared/html-template";

export type PrerenderSlots = Readonly<Record<string, () => HtmlFragment>>;

const SLOT_PATTERN = /<!--prerender:([a-z0-9-]+)-->/g;

function slotToken(slotName: string): string {
  return `<!--prerender:${slotName}-->`;
}

export function prerenderContentPlugin(slots: PrerenderSlots): Plugin {
  return {
    name: "prerender-content",
    transformIndexHtml: {
      order: "pre",
      handler(documentMarkup) {
        let result = documentMarkup;

        for (const [slotName, render] of Object.entries(slots)) {
          const token = slotToken(slotName);
          if (!result.includes(token)) {
            throw new Error(
              `prerender-content: no "${token}" slot found in index.html. ` +
                `Either add the slot or drop the renderer from vite.config.ts.`,
            );
          }
          result = result.replace(token, renderFragmentToMarkup(render()));
        }

        // A slot with no renderer would otherwise ship as a silent empty
        // comment — the page would just be missing a section.
        const unfilled = [...result.matchAll(SLOT_PATTERN)].map((match) => match[1]);
        if (unfilled.length > 0) {
          throw new Error(
            `prerender-content: index.html has slots with no renderer: ${unfilled.join(", ")}.`,
          );
        }

        return result;
      },
    },
  };
}

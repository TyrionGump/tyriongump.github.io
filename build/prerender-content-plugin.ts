// Renderers run here in Node, at build time and per dev request, so they must not touch the DOM.

import type { Plugin } from "vite";

import { renderFragmentToMarkup, type HtmlFragment } from "../src/lib/html-template";

export type PrerenderSlots = Readonly<Record<string, (pageId: string) => HtmlFragment>>;

const SLOT_PATTERN = /<!--prerender:([a-z0-9-]+)-->/g;
const PAGE_ID_PATTERN = /<html\b[^>]*\bdata-page="([^"]+)"/;

export function prerenderContentPlugin(slots: PrerenderSlots): Plugin {
  return {
    name: "prerender-content",
    transformIndexHtml: {
      order: "pre",
      handler(documentMarkup, context) {
        const pageId = PAGE_ID_PATTERN.exec(documentMarkup)?.[1];
        if (!pageId) {
          throw new Error(`prerender-content: ${context.path} has no <html data-page="…">.`);
        }

        let result = documentMarkup;
        for (const [slotName, render] of Object.entries(slots)) {
          const token = `<!--prerender:${slotName}-->`;
          if (!result.includes(token)) {
            throw new Error(`prerender-content: ${context.path} has no "${token}" slot.`);
          }
          result = result.replace(token, renderFragmentToMarkup(render(pageId)));
        }

        const unfilled = [...result.matchAll(SLOT_PATTERN)].map((match) => match[1]);
        if (unfilled.length > 0) {
          throw new Error(
            `prerender-content: ${context.path} has slots with no renderer: ${unfilled.join(", ")}.`,
          );
        }
        return result;
      },
    },
  };
}

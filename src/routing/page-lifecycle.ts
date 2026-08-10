/**
 * How a route's behaviour is started, stopped, and resumed.
 *
 * Two kinds of page exist on this site, and the difference is deliberate:
 *
 *  - **Home replays.** Its shell session is the greeting; arriving at it should
 *    always feel like arriving. It is torn down on leaving and mounted fresh.
 *  - **Work and Personal do not.** Their entrances are long, and watching the
 *    git graph redraw itself every time you come back from Personal would be
 *    tiresome. They mount once and persist, including which commit you left
 *    open, and get `onReturn` instead.
 */

import type { CleanupFunction } from "../animation/cleanup-scope";

export interface MountedPage {
  readonly dispose: CleanupFunction;
  /**
   * Runs when the router comes back to a page that is still mounted. Use it for
   * work that cannot be done while the page is hidden — anything that needs to
   * measure, since a hidden element reports a height of zero.
   */
  readonly onReturn?: () => void;
}

export type PageMounter = (page: HTMLElement) => MountedPage;

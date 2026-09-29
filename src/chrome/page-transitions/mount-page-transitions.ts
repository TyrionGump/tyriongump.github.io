// The only module that knows about swup. Delete it and its call in main.ts,
// and every page change becomes a normal page load again.

import SwupA11yPlugin from "@swup/a11y-plugin";
import SwupHeadPlugin from "@swup/head-plugin";
import SwupPreloadPlugin from "@swup/preload-plugin";
import SwupScrollPlugin from "@swup/scroll-plugin";
import Swup from "swup";

import { setNavigator } from "../../lib/navigation";

export interface PageTransitionHooks {
  /** Runs before the old page's markup is replaced. */
  readonly beforeLeave: () => void;
  /** Runs once the new page's markup is in place. */
  readonly afterEnter: () => void;
}

export function mountPageTransitions(hooks: PageTransitionHooks): void {
  const swup = new Swup({
    containers: ["[data-site-navigation]", "main"],
    // Same-page anchors, such as the skip link, keep their native focus behaviour.
    linkSelector: 'a[href]:not([href^="#"])',
    // Pages bring their own entrance animations.
    animationSelector: false,
    plugins: [
      new SwupHeadPlugin({ persistAssets: true, attributes: ["lang", "data-page"] }),
      // Home's heading is inert while its intro plays. Then the plugin announces the title.
      new SwupA11yPlugin({ headingSelector: "main h1:not([inert] *)" }),
      // Smooth scrolling would fight Work's scroll anchoring.
      new SwupScrollPlugin({
        animateScroll: { betweenPages: false, samePageWithHash: false, samePage: false },
      }),
      new SwupPreloadPlugin(),
    ],
  });

  swup.hooks.on("content:replace", hooks.beforeLeave, { before: true });
  // Replaced content takes its focus with it, and the reset then applies. Focus that
  // the visitor moved to something that stays, such as the console, is kept.
  swup.hooks.before("content:focus", (visit) => {
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) visit.a11y.focus = false;
  });
  swup.hooks.on("page:view", hooks.afterEnter);
  setNavigator((url) => void swup.navigate(url));
}

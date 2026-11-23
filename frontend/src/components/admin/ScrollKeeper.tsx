"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * ScrollKeeper v2 - keeps the window scroll position stable when a save
 * triggers a full reload of the list (loading spinner -> page collapses ->
 * browser snaps to the top -> data arrives -> you are back at the top).
 *
 * Two ways to use it (both do the same thing):
 *   1. HOOK:  call `useScrollKeeper();` once at the top of a client layout
 *   2. JSX:   mount `<ScrollKeeper />` anywhere in the tree
 *
 * How it works:
 *  - remembers the latest scroll position while you work
 *  - watches page height: if it suddenly COLLAPSES by >40% (the save-reload
 *    pattern) it freezes the target position
 *  - when the height RECOVERS (the list is back) it scrolls you back - once,
 *    and only if you have not touched the page meanwhile
 *  - any wheel / touch / key / click from you cancels the pending restore
 *  - navigation resets everything: switching pages still goes to the top
 *
 * Renders nothing, never touches app state or data.
 */
export function useScrollKeeper() {
  const pathname = usePathname();
  const s = useRef({
    lastY: 0,
    maxHeight: 0,
    pendingY: null as number | null,
    dropAt: 0,
    routeChangedAt: 0,
    userActed: false,
    raf: 0,
  });

  // Route change: reset the baseline. Next.js scrolls to the top itself;
  // we only make sure a restore never fires across pages.
  useEffect(() => {
    const st = s.current;
    st.pendingY = null;
    st.userActed = false;
    st.routeChangedAt = Date.now();
    try {
      st.lastY = window.scrollY;
      st.maxHeight = document.documentElement.scrollHeight;
    } catch {
      /* noop */
    }
  }, [pathname]);

  useEffect(() => {
    const st = s.current;
    const DROP_RATIO = 0.6; // collapse = height fell below 60% of the tallest seen
    const RECOVER_RATIO = 0.8; // recovered = back to 80% of the tallest seen
    const MAX_WAIT_MS = 5000; // give up if the page never grows back
    const GRACE_MS = 1200; // ignore collapses right after a route change / mount

    const tick = () => {
      try {
        const h = document.documentElement.scrollHeight;
        const now = Date.now();
        if (st.pendingY === null) {
          if (h > st.maxHeight) st.maxHeight = h;
          if (
            st.maxHeight > 0 &&
            now - st.routeChangedAt > GRACE_MS &&
            h < st.maxHeight * DROP_RATIO
          ) {
            // big collapse -> remember where the user was
            const target = Math.min(
              st.lastY,
              Math.max(0, st.maxHeight - window.innerHeight)
            );
            st.pendingY = target;
            st.dropAt = now;
            st.userActed = false;
          }
        } else {
          if (st.userActed || now - st.dropAt > MAX_WAIT_MS) {
            // the user took over, or the page never recovered - stand down
            st.pendingY = null;
            st.maxHeight = h;
          } else if (h >= st.maxHeight * RECOVER_RATIO) {
            // list is back -> put the user back where they were
            const y = Math.min(
              st.pendingY as number,
              Math.max(0, h - window.innerHeight)
            );
            st.pendingY = null;
            st.maxHeight = h;
            requestAnimationFrame(() => {
              try {
                window.scrollTo(0, y);
              } catch {
                /* noop */
              }
            });
          }
        }
      } catch {
        /* never crash the admin over scroll bookkeeping */
      }
    };

    const onScroll = () => {
      if (st.pendingY !== null) return; // frozen while a restore is pending
      if (!st.raf) {
        st.raf = requestAnimationFrame(() => {
          st.raf = 0;
          try {
            st.lastY = window.scrollY;
          } catch {
            /* noop */
          }
        });
      }
    };

    // any human interaction cancels the pending restore
    const onUserAct = () => {
      if (st.pendingY !== null) st.userActed = true;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onUserAct, { passive: true });
    window.addEventListener("touchmove", onUserAct, { passive: true });
    window.addEventListener("pointerdown", onUserAct, { passive: true });
    window.addEventListener("keydown", onUserAct);
    const timer = window.setInterval(tick, 150);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onUserAct);
      window.removeEventListener("touchmove", onUserAct);
      window.removeEventListener("pointerdown", onUserAct);
      window.removeEventListener("keydown", onUserAct);
      window.clearInterval(timer);
      if (st.raf) cancelAnimationFrame(st.raf);
    };
  }, []);

  return null;
}

/** Renderless component form: mount <ScrollKeeper /> anywhere in the layout. */
export function ScrollKeeper() {
  useScrollKeeper();
  return null;
}

export default ScrollKeeper;

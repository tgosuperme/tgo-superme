'use client';

/**
 * lego — the entrance driver for the site-wide brick motion.
 *
 * Two IntersectionObservers and one MutationObserver, mounted once from the
 * root layout, for the WHOLE document. Nothing here is per-component, so a
 * section opts in purely by putting an attribute on an element:
 *
 *   data-lego              drop and click into place, ONCE
 *   data-lego-loop         the same, but re-armed every time it leaves the
 *                          viewport, so it replays on each scroll pass
 *   data-lego="x"          slide in from the side instead of dropping
 *   data-lego-stud         the small icon tile — pops just after its parent
 *   style={legoDelay(i)}   stagger within a group (from ./lego-style)
 *
 * Why a MutationObserver as well: the whole below-the-fold tree arrives in a
 * lazily-imported chunk AFTER this mounts, and the FAQ swaps nodes on every
 * open. A one-shot querySelectorAll would miss all of it.
 *
 * `lego-done` is added when the animation ends, which drops `animation: both`
 * and hands the transform back to :hover. Without that step the piece is
 * frozen at its final keyframe and the hover lift silently does nothing.
 *
 * The style helpers live in ./lego-style, NOT here — see the note in that file
 * for why a 'use client' module cannot export them to a Server Component.
 */
import { useEffect } from 'react';

const SELECTOR = '[data-lego],[data-lego-loop],[data-lego-stud]';

export default function LegoObserver() {
  useEffect(() => {
    // Reduced motion: the CSS already forces every piece visible, so there is
    // nothing to observe and no reason to pay for the observers.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const seen = new WeakSet<Element>();

    const onEnd = (e: AnimationEvent) => {
      const el = e.currentTarget as HTMLElement;
      // Only the entrance animations retire; the pulses are infinite and never
      // reach this handler anyway.
      if (e.animationName.startsWith('lego-snap') || e.animationName === 'lego-stud') {
        el.classList.add('lego-done');
      }
    };

    /* Plays once, then stops being watched. Everything that is not the
       timeline uses this: replaying a whole page of cards on every scroll pass
       would be noise, not motion. */
    const once = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('lego-in');
          once.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.14 },
    );

    /* Re-arms on exit. Used by the 5-day timeline, which is meant to replay
       every time you scroll back through it. */
    const loop = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) {
            el.classList.add('lego-in');
          } else {
            // Clearing `lego-done` too is what actually re-arms it: the class
            // kills the animation, so leaving it on would freeze the replay.
            el.classList.remove('lego-in', 'lego-done');
          }
        }
      },
      { rootMargin: '0px 0px -4% 0px', threshold: 0.1 },
    );

    const scan = () => {
      const els = document.querySelectorAll<HTMLElement>(SELECTOR);
      for (const el of els) {
        if (seen.has(el)) continue;
        seen.add(el);
        el.addEventListener('animationend', onEnd);
        (el.hasAttribute('data-lego-loop') ? loop : once).observe(el);
      }
    };

    scan();

    // Coalesce bursts of DOM churn (a lazy chunk landing, an accordion
    // opening) into one scan on the next frame.
    let queued = 0;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        scan();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    /* Safety sweep. IntersectionObserver is asynchronous, and a viewport can
       move faster than it delivers: a jump to an #anchor, a restored scroll
       position on reload, a flung mobile scroll. If a piece is skipped, it
       stays at opacity 0 — invisible content, which is far worse than a
       missed animation. So once scrolling settles, anything sitting in the
       viewport without `lego-in` simply gets it.

       This is a backstop, not the mechanism: in normal scrolling the observer
       has always fired first and this finds nothing to do. */
    let sweepTimer = 0;
    const sweep = () => {
      const h = window.innerHeight;
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (el.classList.contains('lego-in')) return;
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < h) el.classList.add('lego-in');
      });
    };
    const onScroll = () => {
      window.clearTimeout(sweepTimer);
      sweepTimer = window.setTimeout(sweep, 220);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      mo.disconnect();
      once.disconnect();
      loop.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(sweepTimer);
      if (queued) cancelAnimationFrame(queued);
      document
        .querySelectorAll<HTMLElement>(SELECTOR)
        .forEach((el) => el.removeEventListener('animationend', onEnd));
    };
  }, []);

  return null;
}

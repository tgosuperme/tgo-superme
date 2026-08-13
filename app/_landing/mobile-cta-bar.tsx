'use client';

/**
 * The docked CTA for the two pages AFTER the landing page — checkout and
 * confirmation.
 *
 * ./sticky-cta.tsx is the landing page's bar and stays as it is: it is a link
 * to /checkout with the diary facts on it, and it is always shown. These two
 * pages need something different, so this is a separate component rather than
 * more props on that one:
 *
 *  1. The action is not a link. On checkout it submits the form; on the
 *     confirmation page it opens WhatsApp. So the action is passed in as
 *     children and this component only owns the bar.
 *
 *  2. It steps aside. Both pages have their own real CTA in the flow — the Pay
 *     button, the WhatsApp buttons — and a fixed bar sitting on top of the very
 *     button it duplicates reads as a bug. `watch` takes a selector; while any
 *     matching element is on screen the bar slides out and gives the page back.
 *
 * Mobile and tablet only (`lg:hidden`). Above that the checkout summary is a
 * sticky desktop column and the confirmation page fits without help.
 *
 * The animation lives on the INNER element on purpose. `.sm-dock` is an
 * animation with `fill-mode: both`, so its final `transform: none` would win
 * over an inline transform on the same element and the hide would never move.
 * Outer element transforms, inner element docks.
 */
import { useEffect, useRef, useState } from 'react';

import { C } from './shared';

/** Bar height + breathing room, for the spacer each page reserves in flow. */
export const MOBILE_CTA_BAR_SPACE = 84;

export default function MobileCtaBar({
  watch,
  children,
  label,
  trailing,
  note,
}: {
  /**
   * Selector for the page's own in-flow CTA(s). While any of them is on screen
   * the bar hides. Matched with querySelectorAll, so a page with two real CTAs
   * (the confirmation page has two WhatsApp buttons) can pass one selector.
   */
  watch?: string;
  /** The action itself — a submit button, a link, whatever the page needs. */
  children: React.ReactNode;
  /** The offer or the step, named. */
  label: string;
  /** The one fact that sits after it in accent — the price, normally. */
  trailing?: string;
  /** The reassurance under it. Drops out below 380px, where the button wins. */
  note?: React.ReactNode;
}) {
  const [hidden, setHidden] = useState(false);
  /* Which watched elements are currently on screen. A Set rather than a
     boolean because `watch` can match more than one. */
  const onScreen = useRef<Set<Element>>(new Set());

  useEffect(() => {
    if (!watch || typeof IntersectionObserver === 'undefined') return;
    const targets = Array.from(document.querySelectorAll(watch));
    if (targets.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.current.add(entry.target);
          else onScreen.current.delete(entry.target);
        }
        setHidden(onScreen.current.size > 0);
      },
      /* The bottom inset is the bar's own height: without it the real button
         is "visible" while sitting underneath the bar, and the two fight. */
      { rootMargin: `0px 0px -${MOBILE_CTA_BAR_SPACE}px 0px`, threshold: 0 },
    );

    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [watch]);

  return (
    <div
      aria-hidden={hidden || undefined}
      className={`fixed inset-x-0 bottom-0 z-50 lg:hidden ${
        hidden ? 'pointer-events-none' : ''
      }`}
      style={{
        transform: hidden ? 'translate3d(0,110%,0)' : 'translate3d(0,0,0)',
        transition: 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        className="sm-dock"
        style={{
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderTop: `1px solid ${C.line}`,
          boxShadow: '0 -10px 34px -22px rgba(0,32,98,0.4)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="mx-auto flex max-w-[560px] items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p
              className="truncate font-heading text-[14px] font-bold leading-tight"
              style={{ color: C.ink }}
            >
              {label}
              {trailing && (
                <>
                  <span className="mx-1.5" style={{ color: C.lineStrong }}>
                    ·
                  </span>
                  <span style={{ color: C.goldDeep }}>{trailing}</span>
                </>
              )}
            </p>
            {note && (
              <p
                className="mt-0.5 hidden items-center gap-1.5 truncate text-[11.5px] min-[380px]:flex"
                style={{ color: C.inkMuted }}
              >
                {note}
              </p>
            )}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

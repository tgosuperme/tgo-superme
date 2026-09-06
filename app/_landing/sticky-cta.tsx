'use client';

/**
 * The docked CTA. Present from the first screen — it is not scroll-gated,
 * because the offer is a few hundred rupees and the decision is small: there
 * is nothing to earn before showing the button.
 *
 * It docks in with the same brick motion as everything else (`.sm-dock`), on a
 * short delay so it lands just after the hero has painted rather than
 * competing with it.
 *
 * The spacer is not optional. Without it the bar sits over the last few
 * hundred pixels of the footer at every viewport, and on iOS the home
 * indicator eats the button.
 */
import { ArrowRight, CalendarBlank, Clock } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

import { C } from './shared';

export default function StickyCta({
  href,
  title,
  trailing,
  label,
  shortLabel = 'Reserve My Spot',
  tinyLabel = 'Reserve Spot',
  microLabel = 'Reserve',
  date,
  dateShort,
  times,
}: {
  href: string;
  /** The offer, named. */
  title: string;
  /** The one fact that sits after it in accent — the price, normally. */
  trailing?: string;
  label: string;
  shortLabel?: string;
  /** For phones under 380px, where the fuller label squeezes the diary line. */
  tinyLabel?: string;
  /** For 320px phones, where even "Reserve Spot" clips the times. */
  microLabel?: string;
  date: string;
  /** The same date with the month abbreviated — "23rd Sept". Phones only. */
  dateShort: string;
  times: string;
}) {
  return (
    <>
      {/* Reserves the bar's height in normal flow. */}
      <div aria-hidden className="h-[84px] sm:h-[78px]" />

      <div
        className="sm-dock bw-edge-safe fixed inset-x-0 bottom-0 z-50"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderTop: `1px solid ${C.line}`,
          boxShadow: '0 -10px 34px -22px rgba(0,32,98,0.4)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="min-w-0">
            <p
              className="truncate font-heading text-[14px] font-bold leading-tight sm:text-[15.5px]"
              style={{ color: C.ink }}
            >
              {title}
              {trailing && (
                <>
                  <span className="mx-1.5" style={{ color: C.lineStrong }}>
                    ·
                  </span>
                  <span style={{ color: C.goldDeep }}>{trailing}</span>
                </>
              )}
            </p>
            {/* ── the two diary facts ────────────────────────────────────
                TWO renderings, because the phone and the desktop have
                genuinely different problems here.

                On a PHONE the row is the text column plus a 48px-tall pill
                that cannot shrink, and the icons plus "Starts 23rd September"
                plus the times did not fit — the times were pushed under the
                button and clipped. So the phone gets one plain line, no
                icons, the month abbreviated and a bullet between the facts.
                Dropping the icons is what buys the room: two 12px glyphs and
                their gaps cost more width than the word "September" saves.

                From sm up there is room for the icons, and they earn their
                place by letting the eye find the date without reading. */}
            <p
              className="mt-0.5 truncate text-[11px] min-[400px]:text-[11.5px] sm:hidden"
              style={{ color: C.inkMuted }}
            >
              {dateShort} <span aria-hidden>•</span> {times}
            </p>
            <p
              className="mt-0.5 hidden items-center gap-3 truncate text-[12px] sm:flex"
              style={{ color: C.inkMuted }}
            >
              <span className="inline-flex shrink-0 items-center gap-1.5">
                <CalendarBlank weight="bold" className="h-3 w-3" style={{ color: C.skyInk }} />
                Starts {date}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5">
                <Clock weight="bold" className="h-3 w-3" style={{ color: C.peachInk }} />
                {times}
              </span>
            </p>
          </div>

          <Link
            href={href}
            /* The button cannot shrink, so on the narrowest phones it is what
               makes the diary line clip. It steps down in three: the shortest
               label and tightest padding under 380px, the normal short label
               up to sm, the full sentence beyond. Measured at 320/360/375 —
               below 380 the fuller label leaves the times clipped. */
            className="lego-press lego-pulse-glow group inline-flex min-h-[48px] shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold text-white min-[380px]:gap-2 min-[380px]:px-5 min-[380px]:text-[14px] sm:px-7 sm:text-[15px]"
            style={{ background: C.blueFill }}
          >
            {/* Four rungs, each one measured rather than guessed. The
                diary line under the title is the constraint: it must show
                "23rd Sept • 7 AM & 7 PM IST" WHOLE, because a start time
                truncated to "7 P…" is worse than no start time at all. At
                320 that leaves room only for one word on the button. */}
            <span className="min-[360px]:hidden">{microLabel}</span>
            <span className="hidden min-[360px]:inline min-[380px]:hidden">{tinyLabel}</span>
            <span className="hidden min-[380px]:inline sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
            <ArrowRight
              weight="bold"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </>
  );
}

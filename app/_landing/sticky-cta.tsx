'use client';

/**
 * The docked CTA. Present from the first screen — it is not scroll-gated,
 * because the offer is £6 and the decision is small: there is nothing to earn
 * before showing the button.
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
  date,
  times,
}: {
  href: string;
  /** The offer, named. */
  title: string;
  /** The one fact that sits after it in accent — the price, normally. */
  trailing?: string;
  label: string;
  shortLabel?: string;
  date: string;
  times: string;
}) {
  return (
    <>
      {/* Reserves the bar's height in normal flow. */}
      <div aria-hidden className="h-[84px] sm:h-[78px]" />

      <div
        className="sm-dock fixed inset-x-0 bottom-0 z-50"
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
            {/* The two diary facts. Kept on one line and allowed to wrap out
                of existence on the narrowest phones, where the button matters
                more than the reminder. */}
            <p
              className="mt-0.5 flex items-center gap-3 truncate text-[11.5px] sm:text-[12px]"
              style={{ color: C.inkMuted }}
            >
              <span className="inline-flex shrink-0 items-center gap-1.5">
                <CalendarBlank weight="bold" className="h-3 w-3" style={{ color: C.skyInk }} />
                Starts {date}
              </span>
              <span className="hidden shrink-0 items-center gap-1.5 min-[420px]:inline-flex">
                <Clock weight="bold" className="h-3 w-3" style={{ color: C.peachInk }} />
                {times}
              </span>
            </p>
          </div>

          <Link
            href={href}
            className="lego-press lego-pulse-glow group inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold text-white sm:px-7 sm:text-[15px]"
            style={{ background: C.blueFill }}
          >
            <span className="sm:hidden">{shortLabel}</span>
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

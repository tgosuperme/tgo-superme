'use client';

/**
 * The docked CTA. Present from the first screen — it is not scroll-gated,
 * because the offer is a few hundred rupees and the decision is small: there
 * is nothing to earn before showing the button.
 *
 * ── NO ENTRANCE ANIMATION, DELIBERATELY ─────────────────────────────────────
 * It used to carry `.sm-dock`, which is a 0.78s dock with a 0.35s delay and
 * `both` fill — so for the first 1.1 seconds of every visit the only buy
 * button on screen was invisible, then slid up underneath the reader's thumb.
 * On the one element that exists to be pressed immediately, a reveal is a
 * delay dressed as polish. It is now painted with the first frame.
 *
 * ── WHAT IS IN THE BAR ──────────────────────────────────────────────────────
 * Two things and no more: the reassurance plus the date, and the button.
 * It previously also carried the offer name, the price and the session times,
 * which on a 360px phone left the diary line fighting the button for room and
 * made the bar read as a summary of the page rather than as a way off it.
 *
 * Phone   reassurance line, centred, with the button full-width beneath it.
 * sm up   one row: reassurance left, button right.
 *
 * The spacer is not optional. Without it the bar sits over the last few
 * hundred pixels of the footer at every viewport, and on iOS the home
 * indicator eats the button.
 */
import { ArrowRight, ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

import { CTA_STICKY_SHORT, GUARANTEE_LABEL } from '@/lib/cta-copy';

import { C } from './shared';

export default function StickyCta({
  href,
  label,
  shortLabel = CTA_STICKY_SHORT,
  guarantee = GUARANTEE_LABEL,
  date,
  dateShort,
}: {
  href: string;
  label: string;
  /** Used below 360px, where the full sentence and the arrow stop fitting. */
  shortLabel?: string;
  guarantee?: string;
  date: string;
  /** The same date with the month abbreviated — "23rd Sept". Phones only. */
  dateShort: string;
}) {
  /* One definition, rendered at two sizes. The dot is aria-hidden because a
     screen reader reading "bullet" between two facts adds nothing. */
  const reassurance = (short: boolean) => (
    <>
      <ShieldCheck weight="fill" className="h-4 w-4 shrink-0" style={{ color: C.green }} />
      <span>
        {guarantee} <span aria-hidden>•</span> Starts {short ? dateShort : date}
      </span>
    </>
  );

  return (
    <>
      {/* Reserves the bar's height in normal flow. Taller on a phone because
          the bar is two rows there and one row from sm up. Both measured
          against the rendered bar rather than estimated. */}
      <div aria-hidden className="h-[112px] sm:h-[76px]" />

      <div
        className="bw-edge-safe fixed inset-x-0 bottom-0 z-50"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderTop: `1px solid ${C.line}`,
          boxShadow: '0 -10px 34px -22px rgba(0,32,98,0.4)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-2.5 px-4 py-3 sm:flex-row sm:justify-between sm:gap-4 sm:px-8">
          {/* Phone: centred above the button. sm up: left of it. */}
          {/* 11.5px under 360. At 320 the line needs 267px and has 266px, so
              it wrapped to two — which pushed the bar to 123px and left it
              overlapping the footer the spacer had been sized for. Half a
              point of type buys 20px and keeps it on one line. */}
          <p
            className="flex items-center justify-center gap-1.5 text-center text-[11.5px] font-medium min-[360px]:text-[12.5px] sm:text-left sm:text-[13.5px]"
            style={{ color: C.inkSoft }}
          >
            <span className="inline-flex items-center gap-1.5 sm:hidden">
              {reassurance(true)}
            </span>
            <span className="hidden items-center gap-1.5 sm:inline-flex">
              {reassurance(false)}
            </span>
          </p>

          {/* Full-width on a phone, because it is the only thing on its row
              and a centred pill with dead space either side of it just makes
              a smaller target. Auto width from sm up, where it shares a row. */}
          <Link
            href={href}
            className="lego-press lego-pulse-glow group inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold text-white sm:w-auto sm:px-7"
            style={{ background: C.blueFill }}
          >
            <span className="min-[360px]:hidden">{shortLabel}</span>
            <span className="hidden min-[360px]:inline">{label}</span>
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

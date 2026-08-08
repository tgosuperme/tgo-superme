/**
 * Above-the-fold hero. A pure Server Component (no 'use client', no hooks) so
 * it paints from static HTML with zero JavaScript on the critical path.
 *
 * Visual system: white and pale blue are the environment, colour lands only on
 * individual elements (badges, icon beds, pills, single headline words, the
 * play button, stat glyphs). No large colour areas, no gradient surfaces, no
 * decorative shapes. The page background stays white.
 *
 * Copy is verbatim from the signed-off PDF. Three devices from the reference
 * page are deliberately absent and must stay absent, because the UK rules this
 * page was reviewed against forbid all three: a rising-price line, a struck
 * list price with a savings badge, and a percentage outcome claim.
 */
import {
  ArrowRight,
  CalendarBlank,
  Clock,
  Heart,
  Lock,
  Play,
  ShieldCheck,
  Student,
  UsersThree,
  VideoCamera,
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

import {
  C,
  CHECKOUT_HREF,
  PRICE_LABEL,
  SESSION_TIMES,
  START_DATE,
} from './shared';

/* ── 1. Offer strip ───────────────────────────────────────────────────────
   A single quiet line on pale blue. The dark scrolling marquee this replaces
   belonged to the old palette and fought the white canvas. */
export function OfferStrip() {
  return (
    <div
      className="w-full px-4 py-2.5 text-center text-[12.5px] font-medium"
      style={{ background: C.lightBlue, color: C.ink }}
    >
      <span className="font-semibold">Special offer:</span> 5-Day Pain Reset
      Challenge for {PRICE_LABEL}
      <span className="mx-2" style={{ color: C.blue }}>
        ·
      </span>
      Live, starts {START_DATE}, {SESSION_TIMES}
    </div>
  );
}

/* ── the three information pills under the CTA ────────────────────────── */
const PILLS = [
  { icon: CalendarBlank, text: `Starts ${START_DATE}`, bed: C.lightBlue, fg: C.skyInk },
  { icon: Clock, text: SESSION_TIMES, bed: '#FDF1E4', fg: C.peachInk },
  { icon: VideoCamera, text: 'Live on Zoom', bed: '#EAF6F0', fg: C.mintInk },
];

/* ── 2. Hero ──────────────────────────────────────────────────────────── */
export function Hero() {
  return (
    <section data-hero className="bg-white pb-6 pt-10 md:pt-14 lg:pt-16">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 md:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
        {/* ══ LEFT ══════════════════════════════════════════════════════ */}
        <div className="text-center lg:text-left">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ background: C.lightBlue, color: C.skyInk }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: C.blue }}
            />
            For Adults 35+ With Persistent Back, Neck or Knee Pain
          </span>

          {/* Four words carry colour, one accent each: the promise word in
              blue, then the three body areas in coral, mint and yellow.
              Everything else stays navy, which is what stops it reading as a
              rainbow. */}
          <h1
            className="mt-6 font-heading text-[36px] font-bold leading-[1.06] tracking-[-0.02em] sm:text-[46px] lg:text-[58px]"
            style={{ color: C.ink }}
          >
            Ease Stiffness, Improve Mobility &amp; Feel{' '}
            <span style={{ color: C.hlBlue }}>Stronger</span> In Your{' '}
            <span style={{ color: C.hlCoral }}>Back</span>,{' '}
            <span style={{ color: C.hlMint }}>Neck</span> &amp;{' '}
            <span style={{ color: C.hlYellow }}>Knees</span> Again
          </h1>

          <p
            className="mx-auto mt-5 max-w-[560px] text-[16px] leading-relaxed lg:mx-0"
            style={{ color: C.inkSoft }}
          >
            A live, coach-led pain reset challenge that combines guided
            movement, breath work, strengthening and real-time correction to
            ease stiffness, improve mobility, and make everyday movement feel
            easier again. Starts {START_DATE}, live on Zoom.
          </p>

          <div className="mt-8 flex justify-center lg:justify-start">
            <Link
              href={CHECKOUT_HREF}
              className="group inline-flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-full px-8 text-[15.5px] font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto"
              style={{
                background: C.blueFill,
                boxShadow: '0 14px 30px -12px rgba(38,140,179,0.6)',
              }}
            >
              Start Your 5-Day Reset · {PRICE_LABEL}
              <ArrowRight
                weight="bold"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          <p
            className="mt-3.5 flex items-center justify-center gap-2 text-[13.5px] lg:justify-start"
            style={{ color: C.inkMuted }}
          >
            <ShieldCheck weight="fill" className="h-4 w-4" style={{ color: C.green }} />
            Full refund if you don&apos;t love Day One
          </p>

          <ul className="mt-7 flex flex-wrap justify-center gap-2.5 lg:justify-start">
            {PILLS.map(({ icon: Icon, text, bed, fg }) => (
              <li
                key={text}
                className="inline-flex items-center gap-2 rounded-full py-2 pl-2 pr-4 text-[13px] font-medium"
                style={{
                  background: C.white,
                  border: `1px solid ${C.line}`,
                  color: C.ink,
                }}
              >
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ background: bed }}
                >
                  <Icon weight="bold" className="h-3 w-3" style={{ color: fg }} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* ══ RIGHT — the offer card ════════════════════════════════════ */}
        <div>
          <div
            className="overflow-hidden rounded-[26px] bg-white"
            style={{
              border: `1px solid ${C.lineStrong}`,
              boxShadow: '0 24px 60px -34px rgba(24,59,86,0.22)',
            }}
          >
            {/* Video slot: pale blue field, blue play button, colourful timing
                badge. Fixed 16:10 so nothing shifts when the still lands. */}
            <div
              className="relative m-3 overflow-hidden rounded-[18px]"
              style={{ background: C.paleBlue }}
            >
              <div className="flex aspect-[16/10] w-full items-center justify-center">
                <button
                  type="button"
                  aria-label="Play the introduction"
                  className="grid h-16 w-16 place-items-center rounded-full transition-transform duration-300 hover:scale-105"
                  style={{
                    background: C.blueFill,
                    boxShadow: '0 12px 26px -10px rgba(38,140,179,0.6)',
                  }}
                >
                  <Play weight="fill" className="ml-0.5 h-6 w-6 text-white" />
                </button>
              </div>
              <span
                className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em]"
                style={{ background: C.yellow, color: '#4A3405' }}
              >
                <Clock weight="bold" className="h-3 w-3" />
                {SESSION_TIMES}
              </span>
            </div>

            <div className="px-6 pb-6 pt-3">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em]"
                style={{ background: C.lightBlue, color: C.skyInk }}
              >
                The Inner Brace Method™
              </span>

              <h2
                className="mt-3 font-heading text-[23px] font-bold leading-tight"
                style={{ color: C.ink }}
              >
                5-Day Pain Reset Challenge
              </h2>
              <p className="mt-1.5 text-[13.5px]" style={{ color: C.inkMuted }}>
                Live coach-led · Back, Neck &amp; Knee · Zoom · 2 session timings
              </p>

              {/* One price, stated once. No "was", no savings badge. */}
              <div className="mt-5 flex items-baseline gap-2.5">
                <span
                  className="font-heading text-[42px] font-bold leading-none"
                  style={{ color: C.ink }}
                >
                  {PRICE_LABEL}
                </span>
                <span className="text-[13px]" style={{ color: C.inkMuted }}>
                  refunded in full if Day One is not for you
                </span>
              </div>

              <Link
                href={CHECKOUT_HREF}
                className="group mt-5 inline-flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl text-[15.5px] font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
                style={{
                  background: C.blueFill,
                  boxShadow: '0 14px 30px -12px rgba(38,140,179,0.55)',
                }}
              >
                Reserve My Spot
                <ArrowRight
                  weight="bold"
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </Link>

              <p
                className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] font-medium"
                style={{ color: C.inkMuted }}
              >
                <Lock weight="fill" className="h-3 w-3" />
                100% secure · Card / Apple Pay / Google Pay
              </p>
            </div>
          </div>
        </div>
      </div>

      <StatsBar />
    </section>
  );
}

/* ── 3. Stats bar ─────────────────────────────────────────────────────────
   Four items, each with a circular icon on its own pale pastel. The figures
   stay navy, so the colour reads as accent rather than decoration. */
const STATS = [
  { icon: Student, big: '16+ Years', small: 'Teaching & practice', bed: '#EAF6F0', fg: C.mintInk },
  { icon: Heart, big: '1,000+', small: 'Clients supported', bed: '#FCEDE9', fg: C.coralInk },
  { icon: UsersThree, big: '500+', small: 'Teachers trained', bed: C.lightBlue, fg: C.skyInk },
  { icon: ShieldCheck, big: 'E-RYT 500', small: 'Yoga Alliance certified', bed: '#F1EDF7', fg: C.lavenderInk },
];

function StatsBar() {
  return (
    <div className="mx-auto mt-14 max-w-[1180px] px-5 md:px-8">
      <ul
        className="grid grid-cols-2 gap-x-4 gap-y-7 rounded-3xl bg-white px-6 py-8 sm:px-10 lg:grid-cols-4"
        style={{
          border: `1px solid ${C.line}`,
          boxShadow: '0 14px 40px -30px rgba(24,59,86,0.28)',
        }}
      >
        {STATS.map(({ icon: Icon, big, small, bed, fg }) => (
          <li key={big} className="flex items-center gap-3.5">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
              style={{ background: bed }}
            >
              <Icon weight="bold" className="h-5 w-5" style={{ color: fg }} />
            </span>
            <span className="leading-tight">
              <span
                className="block font-heading text-[19px] font-bold"
                style={{ color: C.ink }}
              >
                {big}
              </span>
              <span className="block text-[12.5px]" style={{ color: C.inkMuted }}>
                {small}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

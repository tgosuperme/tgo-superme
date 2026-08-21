/**
 * Above-the-fold hero. A pure Server Component (no 'use client', no hooks) so
 * it paints from static HTML with zero JavaScript on the critical path.
 *
 * Visual system: white and pale blue are the environment, colour lands only on
 * individual elements (badges, icon beds, pills, single headline words, the
 * play button, stat glyphs). No large colour areas, no gradient surfaces, no
 * decorative shapes. The page background stays white.
 *
 * Copy is from the signed-off PDF, except the H1, which the client has since
 * replaced. Three devices from the reference page are deliberately absent and
 * must stay absent: a rising-price line, a struck list price with a savings
 * badge, and a percentage outcome claim. That came from the UK review this
 * page was originally run against, and it holds for India too — ASCI's code
 * and the Consumer Protection Act 2019 treat all three the same way.
 *
 * THE THIRD ONE IS NOW ACTUALLY TRUE. The previous H1 opened "Experience
 * 10–80% Pain Relief in Just 5 Days", which is a percentage outcome claim
 * sitting directly above a rule forbidding percentage outcome claims — the
 * page carried the contradiction rather than resolving it. The replacement
 * headline states what the reader DOES (an hour a day, live, with a coach)
 * instead of what their body will do, so the gap closed on its own.
 * Reintroducing a figure like that would reopen it.
 */
import {
  ArrowRight,
  CalendarBlank,
  Clock,
  Heart,
  Lock,
  ShieldCheck,
  MonitorPlay,
  Student,
  UsersThree,
  VideoCamera,
} from '@phosphor-icons/react/dist/ssr';
import Image from 'next/image';
import Link from 'next/link';

import BrandMark from '@/components/BrandMark';
import { PAYMENT_METHODS_LABEL } from '@/lib/payments';

import { legoBrick, legoDelay } from './lego-style';
import {
  C,
  CHECKOUT_HREF,
  PRICE_LABEL,
  SESSION_TIMES_TZ,
  START_DATE,
} from './shared';

/**
 * A soft wash behind a number in the headline. Reserved for NUMBERS — the body
 * areas keep their coloured words, so the two systems stay tellable apart.
 *
 * ── WHY A WASH AND NOT A SLAB ───────────────────────────────────────────────
 * Solid sky (#2AAAEF) is 2.59:1 against a white page: at headline size that is
 * not a highlight, it is a block of colour with type trapped inside it, and it
 * shouts over the words either side. Sky at 34% blends to #B7E2FA — 1.38:1
 * against the page, so it still reads as a deliberate mark, while navy type
 * sits on it at 11:1.
 *
 * The type colour does NOT change inside the mark. Everything in the headline
 * is navy; only the ground behind these words shifts. That is what makes it
 * subtle rather than a second competing colour.
 *
 * The pale blues in the palette were the obvious first reach and are the wrong
 * answer: lightBlue and skyBed sit at 1.13:1 and 1.12:1 against white, which
 * is a highlight nobody can see.
 *
 * ── TWO PROPERTIES THAT ARE NOT OPTIONAL ────────────────────────────────────
 * `white-space: nowrap` keeps the marked phrase whole. It earned its place on
 * the previous headline's "10–80%", which broke after the en dash and rendered
 * the wash as two ragged blocks on two lines. It still matters for "1 Hour",
 * which would otherwise be free to break between the number and the unit —
 * the same fault with a less obvious trigger.
 *
 * `box-decoration-break: clone` covers the case where a mark still has to
 * wrap; without it the padding and rounded corners land on the outer ends only
 * and the break looks like a rendering fault.
 *
 * Padding and radius are in `em`, so they scale with the headline at each
 * breakpoint instead of being three fixed values that only look right at one.
 */
function Mark({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: 'rgba(42,170,239,0.34)',
        color: C.ink,
        padding: '0.02em 0.2em',
        borderRadius: '0.14em',
        whiteSpace: 'nowrap',
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
      }}
    >
      {children}
    </span>
  );
}

/* ── 1. Offer strip ───────────────────────────────────────────────────────
   A single quiet line on pale blue. The dark scrolling marquee this replaces
   belonged to the old palette and fought the white canvas. */
export function OfferStrip() {
  return (
    <div
      className="w-full px-4 py-2.5 text-center text-[12.5px] font-medium"
      style={{ background: C.lightBlue, color: C.ink }}
    >
      {/* Two centred lines on a phone, split between WHAT the offer is and
          WHEN it runs. One line from sm up, where it fits. */}
      <span className="font-semibold">Special offer:</span> 5-Day Pain Reset
      Challenge for {PRICE_LABEL}
      <br className="sm:hidden" />
      <span className="mx-2" style={{ color: C.blue }}>
        ·
      </span>
      Live, starts {START_DATE}, {SESSION_TIMES_TZ}
    </div>
  );
}

/* ── 1b. Site header ──────────────────────────────────────────────────────
   The logo alone, centred on mobile and left-aligned from sm up. No nav: this
   is a single-offer page and every link out of it is a way to not buy. */
export function SiteHeader() {
  return (
    <header className="bg-white">
      <div className="mx-auto flex max-w-[1180px] items-center justify-center px-5 py-4 sm:justify-start md:px-8">
        <BrandMark height={42} priority />
      </div>
    </header>
  );
}

/* ── the three information pills under the CTA ────────────────────────── */
const PILLS = [
  { icon: CalendarBlank, text: `Starts ${START_DATE}`, bed: C.lightBlue, fg: C.skyInk },
  { icon: Clock, text: SESSION_TIMES_TZ, bed: C.peachBed, fg: C.peachInk },
  { icon: VideoCamera, text: 'Live on Zoom', bed: C.mintBed, fg: C.mintInk },
  /* Recordings are part of the offer, so they belong above the fold with
     the other three facts a reader checks before deciding. */
  { icon: MonitorPlay, text: 'Recordings included', bed: C.lavenderBed, fg: C.lavenderInk },
];

/* ── 2. Hero ──────────────────────────────────────────────────────────── */
export function Hero() {
  return (
    /* Top padding is lighter than it was: the header now sits above this
       and supplies most of the breathing room the hero used to make. */
    <section data-hero className="bg-white pb-6 pt-4 md:pt-7 lg:pt-9">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 md:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
        {/* ══ LEFT ══════════════════════════════════════════════════════ */}
        <div className="text-center lg:text-left">
          {/* Eyebrow in primary blue, not the derived skyInk it used to carry.
              At 11px on the pale-blue pill the text needs 4.5:1: skyInk only
              reached 4.04 and bright sky #2AAAEF is 2.30, so neither can hold
              it. Primary blue is 6.08:1 here. Bright sky moves to the dot,
              which is a mark rather than type and has no floor to clear. */}
          <span
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ background: C.lightBlue, color: C.blue }}
          >
            <span
              className="lego-pulse-dot inline-block h-2 w-2 shrink-0 rounded-full"
              style={{
                background: C.sky,
                ['--dot-pulse' as string]: 'rgba(42,170,239,0.6)',
              }}
            />
            {/* Wrapped so the two mobile lines centre against each other
                rather than ragging off the dot. */}
            <span className="text-center">
              For Adults 35+ With Persistent Back,
              <br className="sm:hidden" /> Neck or Knee Pain
            </span>
          </span>

          {/* ONE SIZE, ONE WEIGHT, ONE FACE for the whole headline.

              Two emphasis systems, doing two different jobs: a soft wash on
              the NUMBER, coloured words on the BODY AREAS. Same treatment for
              both would leave the reader nothing to rank.

              THE SIZE STEPS ARE UNCHANGED, and that is a decision rather than
              an oversight. They were dropped a notch when the headline grew to
              two sentences; this one is a single sentence and shorter, so
              there is now room to step them back up. Left alone because the
              constraint that set them is still live — the CTA has to stay
              above the fold on a laptop — and because a headline that fits
              comfortably is worth more than one that fills its box. Worth
              revisiting on a real screen, not by arithmetic.

              `text-balance` is what fixes the ragged wrap — the browser evens
              the line lengths itself instead of dumping one orphan word onto a
              line of its own, and it does that at every width, so it needs no
              per-breakpoint <br> babysitting.

              NO HARD BREAK, though the copy was supplied broken after "With".
              A <br> here pins one wrap point at every width: it is right on a
              laptop and wrong on a phone, where it strands a short line above
              a full one — which is exactly what the previous headline's break
              did before it was removed. The balancer gets the same result on
              wide screens and a better one on narrow.

              The same measure as the standfirst below (`max-w-[560px]
              mx-auto`), so the headline, the paragraph and the CTA all share
              one set of left and right edges instead of each finding its own. */}
          <h1
            className="mx-auto mt-6 max-w-[560px] text-balance font-heading text-[30px] font-bold leading-[1.14] tracking-[-0.02em] sm:text-[38px] lg:mx-0 lg:max-w-none lg:text-[46px]"
            style={{ color: C.ink }}
          >
            {/* Both emphasis systems still do their original jobs, and the
                mapping is the one the rest of the page already uses: coral is
                the back, mint the neck, yellow the knees, everywhere they
                appear. Changing the headline does not get to re-cast them.

                The wash lands on "1 Hour", which is the only number in the
                sentence and the whole substance of the offer — an hour a day
                is what the reader is being asked for, so it is what the eye
                should catch first.

                LIVE keeps the client's capitals AND takes primary blue. The
                capitals alone read as shouting; the blue turns them into the
                headline's one branded word, and without it blue disappears
                from the headline entirely. */}
            Ease <span style={{ color: C.hlCoral }}>Back</span>,{' '}
            <span style={{ color: C.hlMint }}>Neck</span> &amp;{' '}
            <span style={{ color: C.hlYellow }}>Knee</span> Pain With Just{' '}
            <Mark>1 Hour</Mark> A Day,{' '}
            <span style={{ color: C.hlBlue }}>LIVE</span> With An Expert Coach
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
              className="lego-press lego-pulse-glow group inline-flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-full px-8 text-[15.5px] font-semibold text-white sm:w-auto"
              style={{ background: C.blueFill }}
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
            100% Money Back Guarantee
          </p>

          <ul className="mt-7 flex flex-wrap justify-center gap-2.5 lg:justify-start">
            {PILLS.map(({ icon: Icon, text, bed, fg }, idx) => (
              <li
                key={text}
                data-lego=""
                className="lego-hover-sm inline-flex items-center gap-2 rounded-full py-2 pl-2 pr-4 text-[13px] font-medium"
                style={{
                  ...legoBrick(idx, 90),
                  background: C.white,
                  border: `1px solid ${C.line}`,
                  color: C.ink,
                }}
              >
                <span
                  className="lego-stud inline-flex h-6 w-6 items-center justify-center rounded-full"
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
            data-lego=""
            className="overflow-hidden rounded-[26px] bg-white"
            style={{
              ...legoDelay(2, 90),
              border: `1px solid ${C.lineStrong}`,
              boxShadow: '0 24px 60px -34px rgba(24,59,86,0.22)',
            }}
          >
            {/* The system image replaces the old video slot and its play
                button. There is no introduction video, so a play control was
                promising something that did not exist.

                priority + fetchPriority: this is now the hero's largest paint
                on desktop, so it must not be lazy-loaded. The intrinsic size
                is passed so the box is reserved before the bytes land and
                nothing shifts. */}
            <div
              className="relative m-3 overflow-hidden rounded-[18px]"
              style={{ background: C.white }}
            >
              {/* No overlay badge. The old one sat top-left over the video
                  field, which was empty; on this artwork it lands on the Inner
                  Brace Method roundel. The session times are already carried by
                  the offer strip above, the pills under the CTA and the docked
                  bar, so nothing is lost by dropping it. */}
              <Image
                src="/bonuses/system-image-india.png"
                alt="The 5-Day Pain Reset system: live Zoom sessions twice daily, WhatsApp community support, and the four guides"
                width={1586}
                height={992}
                sizes="(max-width: 1024px) 92vw, 560px"
                priority
                className="h-auto w-full"
              />
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
                  100% Money Back Guarantee
                </span>
              </div>

              <Link
                href={CHECKOUT_HREF}
                className="lego-press lego-pulse-glow group mt-5 inline-flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl text-[15.5px] font-semibold text-white"
                style={{ background: C.blueFill }}
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
                100% secure · {PAYMENT_METHODS_LABEL}
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
  { icon: Student, big: '16+ Years', small: 'Teaching & practice', bed: C.mintBed, fg: C.mintInk },
  { icon: Heart, big: '1,000+', small: 'Clients supported', bed: C.coralBed, fg: C.coralInk },
  { icon: UsersThree, big: '500+', small: 'Teachers trained', bed: C.lightBlue, fg: C.skyInk },
  { icon: ShieldCheck, big: 'E-RYT 500', small: 'Yoga Alliance certified', bed: C.lavenderBed, fg: C.lavenderInk },
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
        {STATS.map(({ icon: Icon, big, small, bed, fg }, idx) => (
          /* lego-hover-icon, not lego-hover-sm: the whole row is the hover
             target so the hit area stays generous, but only the glyph moves.
             Lifting a stat's figure and caption drags the eye off the number,
             which is the one thing in the row worth reading. */
          <li
            key={big}
            data-lego=""
            className="lego-hover-icon flex items-center gap-3.5 rounded-2xl"
            style={legoBrick(idx, 85)}
          >
            <span
              data-lego-stud=""
              className="lego-stud grid h-11 w-11 shrink-0 place-items-center rounded-full"
              style={{ ...legoBrick(idx, 85), background: bed }}
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

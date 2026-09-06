/**
 * Above-the-fold hero. A pure Server Component (no 'use client', no hooks) so
 * it paints from static HTML with zero JavaScript on the critical path.
 *
 * Visual system: white and pale blue are the environment, colour lands only on
 * individual elements (badges, icon beds, pills, single headline words, the
 * play button, stat glyphs). No large colour areas, no gradient surfaces, no
 * decorative shapes. The page background stays white.
 *
 * Copy is verbatim from the signed-off PDF. Two devices from the reference
 * page are deliberately absent and must stay absent: a rising-price line, and
 * a struck list price with a savings badge.
 *
 * ── THE "10–80%" IN THE H1 IS A KNOWN, ACCEPTED RISK ────────────────────────
 * That figure is a percentage outcome claim, and the UK review this page was
 * originally run against forbade those outright. India is not more permissive
 * here: ASCI's code and the Consumer Protection Act 2019's rules on
 * misleading advertisements both expect a quantified result claim to be
 * substantiated, and an unsubstantiated one on a health page is squarely the
 * kind of thing they exist to catch.
 *
 * It was removed for that reason and the client has since asked for it back,
 * which is their call to make — recorded here rather than argued with. If it
 * runs, it needs evidence behind it: the client case files the "Results"
 * section of /terms already points at have to actually support a 10 to 80%
 * range, and the page's existing "results vary from person to person" line
 * has to stay everywhere it appears. Do not extend the pattern — a second
 * quantified claim elsewhere on the page compounds the exposure.
 */
import {
  ArrowRight,
  CalendarBlank,
  Clock,
  Heart,
  Lock,
  ShieldCheck,
  Student,
  UsersThree,
  VideoCamera,
} from '@phosphor-icons/react/dist/ssr';
import Image from 'next/image';
import Link from 'next/link';

import BrandMark from '@/components/BrandMark';
import type { ResolvedOffer } from '@/lib/offer';
import { PAIN_EYEBROW, PAIN_KEYS } from '@/lib/variants';

import { legoBrick, legoDelay } from './lego-style';
import { C } from './shared';

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
 * `white-space: nowrap` keeps the marked phrase whole. Without it "10–80%"
 * breaks after the en dash and the wash renders as two ragged blocks on two
 * lines, which is exactly what it did the first time.
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
/** One pass of the strip's five facts. Rendered twice on phones, see below. */
function StripRun({ offer }: { offer: ResolvedOffer }) {
  const dot = (
    <span className="px-2" style={{ color: C.blue }} aria-hidden>
      ·
    </span>
  );
  return (
    /* whitespace-nowrap is what makes it a marquee rather than a wrapping
       paragraph: without it the run breaks at the viewport and the track
       collapses to one screen wide, so -50% travels almost nothing. */
    <span className="flex shrink-0 items-center whitespace-nowrap px-2">
      <span className="font-semibold">5-Day Pain Reset Challenge</span>
      {dot}
      {offer.priceLabel}
      {dot}
      Starts {offer.startsLabel}
      {dot}
      {offer.sessionTimes}
      {dot}
      100% Money-Back Guarantee
      {/* Trailing separator so copy one runs into copy two the same way every
          other pair of facts meets. Without it the loop point reads as a gap. */}
      {dot}
    </span>
  );
}

export function OfferStrip({ offer }: { offer: ResolvedOffer }) {
  return (
    <div
      className="w-full text-[12.5px] font-medium"
      style={{ background: C.lightBlue, color: C.ink }}
    >
      {/* ══ phones · one moving line ═══════════════════════════════════════
          Five facts across 360px wrapped to three ragged centred lines, which
          read as a paragraph that had lost its layout rather than as a strip.
          Running them past once keeps the strip one line tall at every width
          and gets the guarantee in front of people who would never have
          reached line three. */}
      <div className="sm-strip-viewport overflow-hidden py-2.5 sm:hidden">
        <div className="sm-strip-track">
          <StripRun offer={offer} />
          {/* The seam copy. aria-hidden so the facts are announced once. */}
          <span className="sm-strip-dup flex shrink-0" aria-hidden>
            <StripRun offer={offer} />
          </span>
        </div>
      </div>

      {/* ══ sm and up · the original centred line ══════════════════════════
          It fits from sm up, and a marquee on a line that already fits is
          motion for its own sake — worse than the static line, not better. */}
      <div className="hidden px-4 py-2.5 text-center sm:block">
        <span className="font-semibold">5-Day Pain Reset Challenge</span> ·{' '}
        {offer.priceLabel}
        <span className="mx-2" style={{ color: C.blue }}>
          ·
        </span>
        Starts {offer.startsLabel} · {offer.sessionTimes}
        <span className="mx-2" style={{ color: C.blue }}>
          ·
        </span>
        100% Money-Back Guarantee
      </div>
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

/* ── the three information pills under the CTA ──────────────────────────
   THREE, not four. "Recordings included" is gone deliberately: recordings are
   now what the VIP pass is FOR, so promising them above the fold sells the
   upsell away before the buyer reaches it — and contradicts the sessions band
   further down, which now says recordings come with VIP. */
function pillsFor(offer: ResolvedOffer) {
  return [
    { icon: CalendarBlank, text: `Starts ${offer.startsLabel}`, bed: C.lightBlue, fg: C.skyInk },
    { icon: Clock, text: offer.sessionTimes, bed: C.peachBed, fg: C.peachInk },
    { icon: VideoCamera, text: 'Live on Zoom', bed: C.mintBed, fg: C.mintInk },
  ];
}

/* ── 2. Hero ──────────────────────────────────────────────────────────── */
export function Hero({ offer }: { offer: ResolvedOffer }) {
  const PILLS = pillsFor(offer);
  return (
    /* Top padding is lighter than it was: the header now sits above this
       and supplies most of the breathing room the hero used to make. */
    <section data-hero className="bg-white pb-6 pt-4 md:pt-7 lg:pt-9">
      {/* The column split and the gap are set by the EYEBROW, not by the
          picture. At 1.02fr with a 64px gutter the left column was ~536px and
          the eyebrow needs ~570px, so it broke to two lines and the pill
          became a two-line lozenge sitting above the headline — the widest,
          loudest thing in the hero being the smallest type on it.

          So the gutter drops to 40px (56px from xl, where there is room to
          spare) and the split moves to 1.12fr. That buys the left column
          ~66px, which is enough at every width from lg up. The image column
          loses the same 66px and is unharmed by it: it is a photographic card
          that scales, with no text of its own to reflow. */}
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 md:px-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10 xl:gap-14">
        {/* ══ LEFT ══════════════════════════════════════════════════════ */}
        <div className="text-center lg:text-left">
          {/* Eyebrow in primary blue, not the derived skyInk it used to carry.
              At 11px on the pale-blue pill the text needs 4.5:1: skyInk only
              reached 4.04 and bright sky #2AAAEF is 2.30, so neither can hold
              it. Primary blue is 6.08:1 here. Bright sky moves to the dot,
              which is a mark rather than type and has no floor to clear. */}
          {/* Tracking eases from 0.14em to 0.08em at lg. Wide tracking is what
              makes 11px uppercase legible on a phone, where the pill has the
              full column to itself; on a desktop it was costing ~35px of the
              line and buying nothing, because the same text is being read at
              the same size in a wider space. lg:whitespace-nowrap then makes
              the single line a guarantee rather than a hope — with the column
              widened above, it has room at 1024 and up. */}
          <span
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] lg:whitespace-nowrap lg:tracking-[0.08em]"
            style={{ background: C.lightBlue, color: C.blue }}
          >
            <span
              className="lego-pulse-dot inline-block h-2 w-2 shrink-0 rounded-full"
              style={{
                background: C.sky,
                ['--dot-pulse' as string]: 'rgba(42,170,239,0.6)',
              }}
            />
            {/* Four eyebrows, one shown. `?p=knee` on the ad's URL swaps this
                to the knee wording so the page repeats the promise the ad
                made; without the parameter the general one stands. The CSS
                that picks one is in globals.css, driven by data-p on <html>.

                Wrapped so the two mobile lines centre against each other
                rather than ragging off the dot. */}
            {(['all', ...PAIN_KEYS] as const).map((k) => (
              <span key={k} data-v-p={k} className="text-center">
                {PAIN_EYEBROW[k]}
              </span>
            ))}
          </span>

          {/* ONE SIZE, ONE WEIGHT, ONE FACE, and one size for BOTH variants.
              The size is set by variant B, which is roughly twice the length
              of A — sizing to A would make B overflow the fold on a laptop,
              and a headline that changes size with the query string reads as
              a rendering fault rather than a test.

              Two emphasis systems, doing two different jobs: a soft wash on
              the NUMBERS, coloured words on the BODY AREAS. Same treatment for
              both would leave the reader nothing to rank.

              `text-balance` is what fixes the ragged wrap — the browser evens
              the line lengths itself instead of dumping one orphan word onto a
              line of its own, and it does that at every width, so it needs no
              per-breakpoint <br> babysitting.

              The same measure as the standfirst below (`max-w-[560px]
              mx-auto`), so the headline, the paragraph and the CTA all share
              one set of left and right edges instead of each finding its own. */}
          <h1
            className="mx-auto mt-6 max-w-[560px] text-balance font-heading text-[30px] font-bold leading-[1.14] tracking-[-0.02em] sm:text-[38px] lg:mx-0 lg:max-w-none lg:text-[46px]"
            style={{ color: C.ink }}
          >
            {/* The colour mapping is the one the rest of the page already
                uses: coral is the back, mint the neck, yellow the knees,
                everywhere they appear. The wash is reserved for the two
                numbers, so the claim and the timeframe are what the eye
                lands on first.

                NO TRAILING FULL STOP. The previous, longer headline needed one
                to separate its two sentences; this is a single clause, and a
                stop after it would read as a period of hesitation before the
                subline rather than as punctuation. */}
            {/* BOTH variants are in the HTML and CSS shows one. `?h=b` on the
                ad's URL picks B. See lib/variants.ts for why this is not
                searchParams — briefly: searchParams would make the whole page
                dynamic, and this is where the ad spend lands. */}
            <span data-v-h="a">
              Get <Mark>10–80%</Mark> Relief From{' '}
              <span style={{ color: C.hlCoral }}>Back</span>,{' '}
              <span style={{ color: C.hlMint }}>Neck</span> &amp;{' '}
              <span style={{ color: C.hlYellow }}>Knee</span> Pain in Just{' '}
              <Mark>5 Days</Mark>
            </span>
            <span data-v-h="b">
              End <span style={{ color: C.hlCoral }}>Back</span>,{' '}
              <span style={{ color: C.hlMint }}>Neck</span> &amp;{' '}
              <span style={{ color: C.hlYellow }}>Knee</span> Pain Naturally in{' '}
              <Mark>5 Live Days</Mark>, Without Medicines, Oil Massages or Surgery
            </span>
          </h1>

          <p
            className="mx-auto mt-5 max-w-[560px] text-[16px] leading-relaxed lg:mx-0"
            style={{ color: C.inkSoft }}
          >
            {/* Line 2 is variant-specific: A leads on what the reader is
                avoiding, B on what most people see. Line 3 is the same under
                both, because the Day 1 / Day 4 score is the proof mechanic the
                whole page rests on. */}
            <span data-v-h="a">
              Without painkillers, oil massages, physio sessions or surgery.
            </span>
            <span data-v-h="b">
              Most people see 10–80% less pain by Day 4. Results vary from
              person to person.
            </span>{' '}
            Score your pain on Day 1. Score it again on Day 4. See your own
            number drop.
          </p>

          {/* A1's subline. Kept as its OWN paragraph rather than folded into
              the one above, because that one is the promise (variant-specific,
              two short sentences) and this is the description of the thing
              being sold — the same split the brief makes between the lines
              under the headline and the line under the image.

              Set a step down in size and weight so it reads as explanation
              rather than a second claim, and it carries the start date and
              the platform, which is why the line above no longer repeats them. */}
          <p
            className="mx-auto mt-3.5 max-w-[560px] text-[14.5px] leading-relaxed lg:mx-0"
            style={{ color: C.inkMuted }}
          >
            A live, coach-led 5-day challenge. Guided movement, breath work,
            strengthening and real-time correction from Atul, so you learn to
            support your back, neck and knees instead of pushing through them.
            Starts {offer.startsLabel}, live on Zoom.
          </p>

          <div className="mt-8 flex justify-center lg:justify-start">
            <Link
              href={offer.ctaHref}
              data-cta="hero"
              className="lego-press lego-pulse-glow group inline-flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-full px-8 text-[15.5px] font-semibold text-white sm:w-auto"
              style={{ background: C.blueFill }}
            >
              {offer.closed
                ? 'Join the next batch'
                : `Start Your 5-Day Reset · ${offer.priceLabel}`}
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
                  {offer.priceLabel}
                </span>
                <span className="text-[13px]" style={{ color: C.inkMuted }}>
                  100% Money Back Guarantee
                </span>
              </div>

              <Link
                href={offer.ctaHref}
                data-cta="hero-card"
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
                100% Secure · UPI · Cards · NetBanking
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
   stay navy, so the colour reads as accent rather than decoration.

   BACK IN THE HERO. These briefly lived under the price card, which was the
   right place while that card existed. The card is gone from the landing page
   — all pricing now happens on /checkout — and these are credentials, not
   pricing, so they belong here rather than disappearing with it. */
const STATS = [
  { icon: Student, big: '16+ Years', small: 'Teaching & practice', bed: C.mintBed, fg: C.mintInk },
  { icon: Heart, big: '1,000+', small: 'People supported', bed: C.coralBed, fg: C.coralInk },
  { icon: UsersThree, big: '500+', small: 'Teachers trained', bed: C.lightBlue, fg: C.skyInk },
  {
    icon: ShieldCheck,
    big: 'E-RYT 500',
    small: 'Kaivalyadhama diploma',
    bed: C.lavenderBed,
    fg: C.lavenderInk,
  },
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
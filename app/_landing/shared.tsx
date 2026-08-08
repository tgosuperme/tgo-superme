/**
 * Shared landing primitives: palette, offer constants, and the framer-free
 * leaf components used by BOTH the static hero and the lazily-hydrated
 * below-the-fold chunk.
 *
 * Kept framer-motion-free on purpose so it can be imported from a Server
 * Component without dragging the animation runtime into the initial bundle.
 */
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

/**
 * Palette. White and pale blue are the environment; the accents are the
 * personality. Roughly 70 to 80% white / very pale blue, 15 to 20% blue,
 * 5 to 10% accent, and accents only ever land on individual elements: icon
 * beds, badges, pills, single headline words, stat glyphs. Never a large area.
 *
 * Derived values are marked. They exist only where a colour is too pale to
 * carry text: sky and the pastels sit at 1.4 to 2.7:1 on white, so anything
 * set on or in them uses the matching *Ink shade.
 */
export const C = {
  /* ── environment ── */
  white: '#FFFFFF',
  paleBlue: '#F5FBFE',
  lightBlue: '#E8F6FB',

  /* ── blue ── */
  sky: '#8CCFE3',       // light blue accent: 1.7:1 on white, so surfaces only
  blue: '#4FA8C7',      // primary brand blue
  blueFill: '#227FA2',  // derived: strong blue #268CB3 is 3.8:1 with a white
                        // label, so buttons use it one step darker (4.5:1)
  blueDeep: '#268CB3',  // CTA / strong blue
  navy: '#183B56',      // main text, deep navy

  /* ── accents (beds, pills, badges) ── */
  mint: '#9FDACB',
  green: '#72B77A',
  coral: '#E98B7A',
  peach: '#F4B28C',
  yellow: '#F2C85B',
  lavender: '#A99ACB',
  rose: '#D36C7E',

  /* ── accent inks: glyphs and text only, never a surface (all derived) ── */
  mintInk: '#32836E',
  greenInk: '#43844B',
  coralInk: '#D73F24',
  peachInk: '#C45313',
  yellowInk: '#966F0C',
  lavenderInk: '#806AB2',
  skyInk: '#267F9A',

  /* ── headline highlight set ───────────────────────────────────────────
     Every accent is too pale to be read as text: on white, mint is 1.6:1,
     yellow 1.6:1, coral 2.5:1 and brand blue 2.7:1. The headline is large and
     bold, so the bar is 3.0:1, and each of these is its accent darkened to
     exactly that. Same hue, readable weight. */
  hlBlue: '#3E9FC1',
  hlCoral: '#E57460',
  hlMint: '#40A58B',
  hlYellow: '#BD8D0F',

  /* ── text and rules ── */
  ink: '#183B56',       // navy, body and headings
  inkSoft: '#526B7A',   // secondary text, slate blue
  inkMuted: '#526B7A',  // same slate blue: the table defines one secondary tone
  line: '#DEEFF4',
  lineStrong: '#C5E2EA',

  /* ── legacy aliases kept so untouched sections still resolve ── */
  gold: '#4FA8C7',
  goldDeep: '#267F9A',
  goldBright: '#8CCFE3',
  goldSoft: '#E8F6FB',
  canvas: '#F5FBFE',
  canvas2: '#E8F6FB',
  sand: '#E8F6FB',
  black: '#0A0A0A',
  brand: '#4FA8C7',
  deep: '#183B56',
  bright: '#8CCFE3',
  blush: '#E8F6FB',
  whisper: '#F5FBFE',
};

export const PRICE = CHECKOUT_CONFIG.amountGbpNumeric;
export const PRICE_LABEL = `${CHECKOUT_CONFIG.currencySymbol}${CHECKOUT_CONFIG.amountGbpString}`;
export const START_DATE = CHECKOUT_CONFIG.startDate;
export const SESSION_TIMES = CHECKOUT_CONFIG.sessionTimes;
export const CHECKOUT_HREF = CHECKOUT_CONFIG.checkoutPath;

export function SectionEyebrow({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em]"
      style={{ background: C.goldSoft, color: C.goldDeep }}
    >
      <span
        className="inline-block h-1 w-1 rounded-full"
        style={{ background: C.gold }}
      />
      {text}
    </span>
  );
}

export function PrimaryCTA({
  href = CHECKOUT_HREF,
  label,
}: {
  href?: string;
  label: string;
}) {
  // Full-width on mobile, natural pill width from sm+ upward.
  return (
    <Link
      href={href}
      className="group inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full px-7 py-4 font-heading text-[15px] font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 sm:w-auto"
      style={{
        background: C.blueFill,
        boxShadow: '0 12px 26px -12px rgba(38,140,179,0.55)',
      }}
    >
      {label}
      <ArrowRight
        weight="bold"
        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </Link>
  );
}

/** The reassurance line that sits under every CTA. */
export function CtaNote({ text }: { text: string }) {
  return (
    <p
      className="mt-3 text-center text-[13px] font-medium"
      style={{ color: C.inkMuted }}
    >
      {text}
    </p>
  );
}

export function SectionHeading({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2
        className="font-heading text-[clamp(28px,4.4vw,44px)] font-bold leading-[1.15] tracking-[-0.01em]"
        style={{ color: C.ink }}
      >
        {children}
      </h2>
      {sub && (
        <p
          className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed sm:text-[16px]"
          style={{ color: C.inkSoft }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

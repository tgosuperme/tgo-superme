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
  paleBlue: '#F4F9FE',   // section backgrounds
  lightBlue: '#E8F3FC',  // cards, pills, subtle surfaces

  /* ── blue ── */
  sky: '#2AAAEF',       // bright sky: highlights, selected states. 2.6:1 on
                        // white, so surfaces and large marks only, never body text
  blue: '#1054C2',      // primary blue: buttons, links, icons, important UI
  blueFill: '#1054C2',  // NOT derived any more. The old teal was 3.8:1 with a
                        // white label so buttons needed a darker step; primary
                        // blue is 6.84:1 and carries white type as-is.
  blueDeep: '#002062',  // deep brand navy: dark sections, footer, strong text
  navy: '#002062',

  /* ── accents (beds, pills, badges). Secondary to the blue, never competing ── */
  mint: '#2EC4B6',
  green: '#22C55E',
  coral: '#FF6B6B',
  peach: '#FFB26D',
  yellow: '#FFC107',
  lavender: '#8B7DFF',
  rose: '#F43F5E',

  /* ── accent beds: the 12% tint each accent sits on ── */
  mintBed: '#E6F8F6',
  greenBed: '#E4F8EC',
  coralBed: '#FFEDED',
  peachBed: '#FFF6ED',
  yellowBed: '#FFF8E1',
  lavenderBed: '#F1EFFF',
  roseBed: '#FEE8EC',
  skyBed: '#E5F5FD',

  /* ── accent inks: glyphs and text only, never a surface (all derived).
     Every accent is too light to read as text on white: yellow is 1.6:1, peach
     1.8:1, mint 2.2:1, coral 2.8:1. Each ink below is its accent darkened to
     exactly 4.5:1 on white, so it also clears 3.9:1+ on its own bed. ── */
  mintInk: '#1E8379',
  greenInk: '#178740',
  coralInk: '#C15151',
  peachInk: '#9B6C42',
  yellowInk: '#967104',
  lavenderInk: '#7367D3',
  roseInk: '#D93853',
  skyInk: '#1F7DB0',

  /* ── headline highlight set ───────────────────────────────────────────
     The headline is large and bold, so the bar is 3.0:1 rather than 4.5:1 and
     each of these is its accent darkened to exactly that. Same hue, readable
     weight. Primary blue already clears it outright, so it is used unchanged. */
  hlBlue: '#1054C2',
  hlCoral: '#F46666',
  hlMint: '#26A498',
  hlYellow: '#BA8C05',

  /* ── text and rules ── */
  ink: '#002062',       // deep brand navy: body and headings, 15.2:1 on white
  inkSoft: '#4A5B80',   // secondary text, navy desaturated toward slate
  inkMuted: '#4A5B80',  // same tone: the table defines one secondary text colour
  line: '#DCE9F9',
  lineStrong: '#C3DCF5',

  /* ── legacy aliases kept so untouched sections still resolve ── */
  gold: '#1054C2',
  /* goldDeep is the SECTION-TITLE HIGHLIGHT: every h2 puts one phrase in it.
     It has to stay distinct from C.ink or the highlight disappears, which is
     exactly what happened when the palette moved and both became #002062.
     Primary blue is 6.84:1 on white and 6.46:1 on the canvas, so it clears the
     3.0:1 large-text bar with room. Bright sky #2AAAEF cannot do this job on a
     light ground: it is 2.59:1 on white. Bright sky is used for the same
     highlight on DARK sections, where it is 5.85:1 and primary blue is 2.22:1. */
  goldDeep: '#1054C2',
  goldBright: '#2AAAEF',
  goldSoft: '#E8F3FC',
  canvas: '#F4F9FE',
  canvas2: '#E8F3FC',
  sand: '#E8F3FC',
  black: '#0A0A0A',
  brand: '#1054C2',
  deep: '#002062',
  bright: '#2AAAEF',
  blush: '#E8F3FC',
  whisper: '#F4F9FE',
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

'use client';

/**
 * The four registration bonuses, sitting between the testimonials and Atul.
 *
 * Layout is the one the client specified: the system image spans the top as a
 * single wide piece, then the four guides in a 2 × 2 below it, reading
 *
 *      ┌──────────── system image ────────────┐
 *      │  back pain        │  knee support    │
 *      │  neck & shoulder  │  unload breath   │
 *
 * The covers are 1199 × 1312 portraits except the breath guide, which is a
 * 1536 × 1024 landscape. They are therefore `object-contain` on a pale bed at a
 * fixed 4:3 rather than cropped to fill — cropping a book mock-up cuts the
 * spine off the tall ones and the title off the wide one.
 *
 * next/image, not <img>: these are 1.3–2.1MB PNG sources and the optimiser
 * serves them sized, as AVIF/WebP.
 *
 * ── ON THE POUND VALUES ──────────────────────────────────────────────────
 * Values are shown per the client's signed-off reference. Note that
 * SuperMe-Bonus-PDFs-Copy.md records a prior compliance decision AGAINST
 * stated pound values on bonuses ("Appendix A: the pound values come off, the
 * contents stay on"), on value-stacking grounds. Flagged, not silently
 * dropped — whether they run is the client's call.
 */
import { CheckCircle, Lightning } from '@phosphor-icons/react/dist/ssr';
import Image from 'next/image';

import { legoBrick, legoDelay } from './lego-style';
import { C, CURRENCY_SYMBOL, SectionEyebrow, SectionHeading } from './shared';

type Bonus = {
  n: string;
  title: string;
  value: number;
  body: string;
  src: string;
  alt: string;
  /** Bed + ink for the badge and value line: one accent each, so the four
      read as a deliberate set rather than four unrelated products. */
  bed: string;
  ink: string;
};

const BONUSES: Bonus[] = [
  {
    n: 'Bonus 1',
    title: 'The Back Pain Relief Guide',
    value: 9,
    body: 'The five postures and two breathing techniques Atul uses to take the load off a guarding lower back, in the order that matters: unload first, strengthen after.',
    src: '/bonuses/back-pain-relief-guide.png',
    alt: 'The Back Pain Relief Guide',
    bed: C.coralBed,
    ink: C.coralInk,
  },
  {
    n: 'Bonus 2',
    title: 'The Knee Support Guide',
    value: 6,
    body: 'Learn which of the two knees you actually have, load-related or arthritic, and the exact strengthening work Atul uses to take pressure off the joint without ever bending a sore knee first.',
    src: '/bonuses/knee-support-guide.png',
    alt: 'The Knee Support Guide',
    bed: C.mintBed,
    ink: C.mintInk,
  },
  {
    n: 'Bonus 3',
    title: 'The Neck & Shoulder Relief Guide',
    value: 7,
    body: "Atul's posture corrections and daily habit fixes for a neck that's been carrying a decade of screen time, paired with a calming breath practice to ease tension through the shoulders.",
    src: '/bonuses/neck-shoulder-relief-guide.png',
    alt: 'The Neck and Shoulder Relief Guide',
    bed: C.lavenderBed,
    ink: C.lavenderInk,
  },
  {
    n: 'Bonus 4',
    title: 'The Unload Breath Guide',
    value: 5,
    body: 'Four techniques explained simply, Nadi Shodhana, Ujjayi, diaphragmatic breathing and Kapalabhati: which one calms which kind of tension, and why breath comes before every movement in the Inner Brace Method.',
    src: '/bonuses/unload-breath-guide.png',
    alt: 'The Unload Breath Guide',
    bed: C.peachBed,
    ink: C.peachInk,
  },
];

const TOTAL = BONUSES.reduce((sum, b) => sum + b.value, 0);

/* Inverted from the rest of the page: the copy sits on the page's pale blue,
   and the cover panel above it is white. That flip means the "instant access"
   strip can no longer be pale blue itself — it would vanish into the panel —
   so it goes white and takes a hairline.

   The cover bed is WHITE rather than the grey it started as, because all four
   source PNGs are 24-bit with no alpha and a near-white (251–254) background
   baked in, drop shadow included. On grey each cover therefore showed as an
   obvious white rectangle. Matching the bed to the artwork is the fix that
   does not involve re-cutting the images.

   If the covers are ever re-exported with real transparency, this can go back
   to a tinted bed — that is the only thing standing in the way. */
const COVER_BED = '#FFFFFF';
const COPY_BED = '#F4F9FE';

export default function Bonuses() {
  return (
    <section className="px-4 py-16 sm:py-24" style={{ background: C.white }}>
      <div className="mx-auto mb-4 flex max-w-3xl justify-center">
        <SectionEyebrow text="Included With Your Place" />
      </div>
      <SectionHeading sub="Four guides written by Atul, sent the moment you register, so you arrive on Day One already knowing what your body needs.">
        Everything You Get{' '}
        <span style={{ color: C.goldDeep }}>The Moment You Join</span>
      </SectionHeading>

      <div className="mx-auto mt-12 max-w-[1060px]">
        {/* ── the system, as one wide piece ───────────────────────────── */}
        <figure
          data-lego
          /* No hover: it is a full-bleed illustration, not a control, and
             lifting a 1060px panel under the cursor is a lot of movement for
             something you cannot click. Entrance animation only. */
          className="overflow-hidden rounded-3xl"
          style={{
            border: `1px solid ${C.line}`,
            background: COVER_BED,
            boxShadow: '0 24px 60px -40px rgba(0,32,98,0.35)',
          }}
        >
          <Image
            src="/bonuses/system-image.png"
            alt="The complete 5-Day Pain Reset system: live sessions, WhatsApp support, step-by-step guides and the four bonus guides"
            width={1586}
            height={992}
            sizes="(max-width: 1100px) 100vw, 1060px"
            className="h-auto w-full"
          />
        </figure>

        {/* ── the four guides, 2 × 2 ─────────────────────────────────── */}
        <ul className="mt-5 grid gap-5 sm:grid-cols-2">
          {BONUSES.map((b, i) => (
            <li
              key={b.title}
              data-lego=""
              /* lego-hover-soft, not lego-hover: a gentle rise with no tilt.
                 These are the largest cards on the page and the full brick
                 lift reads as heavy on them. */
              className="lego-hover-soft flex flex-col overflow-hidden rounded-3xl"
              style={{
                ...legoDelay(i, 90),
                background: COPY_BED,
                border: `1px solid ${C.line}`,
                /* a 3px accent rule along the top edge: enough to tie the card
                   to its one colour, small enough to stay in the 10% */
                borderTop: `3px solid ${b.bed}`,
              }}
            >
              {/* Cover on its own bed. Fixed 4:3 with object-contain, so the
                  portrait and landscape mock-ups sit at the same height
                  without either being cropped through its title. */}
              <div
                className="relative flex aspect-[4/3] items-center justify-center overflow-hidden px-6 pt-5"
                style={{ background: COVER_BED }}
              >
                <Image
                  src={b.src}
                  alt={b.alt}
                  width={600}
                  height={660}
                  sizes="(max-width: 640px) 88vw, 440px"
                  className="lego-stud h-full w-auto max-w-full object-contain"
                />
                <span
                  className="absolute left-4 top-4 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ background: b.bed, color: b.ink }}
                >
                  {b.n}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3
                  className="font-heading text-[17px] font-bold leading-snug"
                  style={{ color: C.ink }}
                >
                  {b.title}
                </h3>
                <p className="mt-1 text-[13px] font-semibold" style={{ color: b.ink }}>
                  ({CURRENCY_SYMBOL}
                  {b.value} value)
                </p>
                <p
                  className="mt-2.5 flex-1 text-[13.5px] leading-relaxed"
                  style={{ color: C.inkSoft }}
                >
                  {b.body}
                </p>

                {/* White, not pale blue: the copy panel is pale blue now, so
                    the old strip colour would have no edge at all. */}
                <div
                  className="mt-5 flex items-center justify-between rounded-2xl px-3.5 py-2.5"
                  style={{ background: C.white, border: `1px solid ${C.line}` }}
                >
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: C.inkSoft }}
                  >
                    <Lightning weight="fill" className="h-3 w-3" style={{ color: C.yellowInk }} />
                    Instant access
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: C.greenInk }}
                  >
                    <CheckCircle weight="fill" className="h-3 w-3" />
                    Included
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* ── the total ──────────────────────────────────────────────── */}
        <div
          data-lego=""
          className="lego-hover-sm mx-auto mt-5 flex max-w-[560px] flex-col items-center justify-between gap-2 rounded-3xl px-7 py-6 text-center sm:flex-row sm:text-left"
          style={{
            ...legoDelay(4, 90),
            background: C.paleBlue,
            border: `1px solid ${C.line}`,
          }}
        >
          <span
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: C.inkMuted }}
          >
            Total value of the four guides
          </span>
          <span
            className="font-heading text-[30px] font-bold leading-none"
            style={{ color: C.goldDeep }}
          >
            {CURRENCY_SYMBOL}
            {TOTAL}
          </span>
        </div>
      </div>
    </section>
  );
}

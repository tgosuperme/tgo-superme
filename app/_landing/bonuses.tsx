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
 *
 * The "You save N%" pill that used to close this section is gone. It was
 * derived from the challenge price, so with the challenge free it read "You
 * save 100%" on every render, which is the value-stacking device in its most
 * naked form. What replaced it says the same true thing without the
 * arithmetic: the guides come with the place, and the place costs nothing.
 */
import { CheckCircle, Crown, Lightning } from '@phosphor-icons/react/dist/ssr';
import Image from 'next/image';

import { BONUSES, FREE_BONUSES, VIP_BONUSES } from './bonus-data';
import { legoBrick, legoDelay } from './lego-style';
import { C, FREE_LABEL, SectionEyebrow, SectionHeading } from './shared';

/* The per-guide values keep their sterling symbol — they describe what a guide
   is worth, not a price anyone is charged for it. Stated once here. */
const POUND = '£';

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
        <SectionEyebrow text="The Guides" />
      </div>
      <SectionHeading
        sub={`Four guides written by Atul. ${FREE_BONUSES.length} arrive the moment you register, free. The other ${VIP_BONUSES.length} come with the optional VIP upgrade you can add afterwards.`}
      >
        Everything You Get{' '}
        {/* Desktop breaks the headline into its two natural halves. Below lg it
            wraps on its own, so the break is suppressed. */}
        <br className="hidden lg:inline" />
        <span style={{ color: C.goldDeep }}>The Moment You Join</span>
      </SectionHeading>

      {/* The system image used to head this block. It now opens the hero, and
          running it twice on one page made the second showing read as a
          mistake rather than a recap — so the section goes straight to the
          four guides it is actually about. */}
      <div className="mx-auto mt-12 max-w-[1060px]">
        {/* ── the four guides, 2 × 2 ─────────────────────────────────── */}
        <ul className="grid gap-5 sm:grid-cols-2">
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
                {/* Sized up from 13px: at that size the value read as a
                    footnote to the title rather than as part of the offer. */}
                <p
                  className="mt-1.5 font-heading text-[17px] font-bold leading-none"
                  style={{ color: b.ink }}
                >
                  {POUND}
                  {b.value}
                  <span className="ml-1.5 text-[12px] font-semibold uppercase tracking-[0.1em]">
                    value
                  </span>
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
                  {/* WHICH TIER THIS GUIDE BELONGS TO, read from bonus-data's
                      own flag. Two come with the free place and two come with
                      the VIP upgrade offered after registering, and this badge
                      is the only thing on the card that says which. Saying
                      "Included" on all four — as this did when everything was
                      free — would promise two guides the upgrade then charges
                      for. */}
                  {b.tier === 'free' ? (
                    <span
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: C.greenInk }}
                    >
                      <CheckCircle weight="fill" className="h-3 w-3" />
                      Free with your place
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
                      style={{ background: C.blueFill }}
                    >
                      <Crown weight="fill" className="h-3 w-3" />
                      VIP
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* ── the value block ────────────────────────────────────────── */}
        <div
          data-lego=""
          className="lego-hover-sm mx-auto mt-5 max-w-[560px] rounded-3xl px-7 py-7 text-center"
          style={{
            ...legoDelay(4, 90),
            background: C.paleBlue,
            border: `1px solid ${C.line}`,
          }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: C.inkMuted }}
          >
            {FREE_BONUSES.length} guides with every free place
          </p>

          <p className="mt-3 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
            {/* The struck total is GONE, and its absence is the point. When
                every guide was free, "£27 → Free" described the whole set
                honestly. Now two of the four sit behind a £4.99 upgrade, so
                striking the full £27 against the word "Free" would price the
                free tier at something it does not include — the exact
                value-stacking sleight this funnel's compliance review ruled
                out, and this time factually wrong as well. */}
            <span
              className="font-heading text-[40px] font-bold leading-none"
              style={{ color: C.goldDeep }}
            >
              {FREE_LABEL}
            </span>
          </p>

          <p
            className="mx-auto mt-3.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ background: C.greenBed, color: C.greenInk }}
          >
            <Lightning weight="fill" className="h-3 w-3" />
            Yours the moment you register
          </p>

          <p className="mt-3 text-[12.5px]" style={{ color: C.inkMuted }}>
            {FREE_BONUSES.map((b) => b.title).join(' and ')} come with your free
            place. The other {VIP_BONUSES.length} are part of the optional VIP
            upgrade you can add after registering.
          </p>
        </div>
      </div>
    </section>
  );
}

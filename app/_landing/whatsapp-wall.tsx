'use client';

/**
 * Messages from the group — a sub-section under the video testimonials.
 *
 * WHY A LIGHTBOX AND NOT JUST CARDS
 * These are phone screenshots: 610 × 1356 of small chat text. At the card size
 * that lets several sit side by side, not one word is readable. So the card is
 * a recognisable preview — the WhatsApp header and the opening messages, top
 * cropped — and tapping it opens the whole thing at full height. Without that
 * the section is decoration pretending to be proof.
 *
 * WHY FLEX-WRAP RATHER THAN A GRID
 * The wall grows as more screenshots arrive, and a fixed column count strands
 * the remainder on a half-empty final row — worse still at one item, where a
 * four-column grid pins the only card to the left edge with three columns of
 * nothing beside it. Wrapping fixed-width cards inside a centred flex row reads
 * as deliberate at any count, from one to a dozen.
 *
 * ── PROVENANCE ────────────────────────────────────────────────────────────
 * These are real conversations. Three of the four were re-rendered to strip
 * the sender's name, photo and anything else identifying before publication;
 * the first is an unedited export.
 *
 * That is ordinary anonymising and it is why there is no disclaimer on them.
 * What it depends on is the ORIGINALS being kept on file — the CAP Code asks
 * an advertiser to hold documentary evidence for any testimonial it runs, and
 * for a re-rendered one the original export is that evidence. Keep them.
 *
 * Anything added here has to clear the same bar: a real message, with the
 * original retained, published with the sender's agreement.
 */
import { ArrowsOutSimple, WhatsappLogo, X } from '@phosphor-icons/react/dist/ssr';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { legoBrick } from './lego-style';
import { C } from './shared';

/**
 * TWO FILES PER SHOT, AND NO IMAGE OPTIMISER ON EITHER.
 *
 * Next's optimiser needs `sharp`; without it the build falls back to a WASM
 * encoder that took tens of seconds on these, and the cards simply sat blank —
 * which is exactly what it looked like from the outside: broken. Vercel ships
 * sharp so production would have been fine, but "fine once deployed" is not
 * something anyone can review.
 *
 * So both sizes are cut ahead of time with ffmpeg and served as-is:
 *
 *     -card  560px wide, ~70KB   the grid, displayed at 135–300px
 *     full   840px wide, ~140KB  the lightbox, displayed up to ~550px
 *
 * Each is about twice its display width, which is the retina size the optimiser
 * would have produced anyway. There is nothing left for it to save, and taking
 * it out of the path makes this section load the same everywhere.
 */
type Shot = {
  /** Full size, for the lightbox. */
  src: string;
  /** Pre-cut grid size. Same picture, a third of the bytes. */
  card: string;
  /** Described for a screen reader, which cannot read text inside an image. */
  alt: string;
  width: number;
  height: number;
};

const SHOTS: Shot[] = [
  {
    src: '/whatsapp/wa-01.jpg',
    card: '/whatsapp/wa-01-card.jpg',
    alt: 'WhatsApp message from a client thanking Atul: back pain felt for the past two years is no more, after the group yoga classes and his guidance.',
    width: 610,
    height: 1356,
  },
  {
    src: '/whatsapp/wa-02.jpg',
    card: '/whatsapp/wa-02-card.jpg',
    alt: 'WhatsApp message from a client: a desk worker describes back and neck discomfort, says the live corrections showed she had been doing movements wrong, and feels more confident about what to do.',
    width: 840,
    height: 1492,
  },
  {
    src: '/whatsapp/wa-03.jpg',
    card: '/whatsapp/wa-03-card.jpg',
    alt: 'WhatsApp message from a client who doubted online sessions says the corrections helped, especially on posture, and things feel clearer.',
    width: 840,
    height: 1492,
  },
  {
    src: '/whatsapp/wa-04.jpg',
    card: '/whatsapp/wa-04-card.jpg',
    alt: 'WhatsApp message from a client saying the live correction was the biggest thing for her, having previously followed exercises from YouTube without doing them properly.',
    width: 840,
    height: 1492,
  },
];

/**
 * How long the mobile rail takes to travel one full set.
 *
 * Tuned to SPEED, not to card count. The video rails above run at roughly
 * 32px/s (a 72vw card plus its margin, over 9.2s). These cards are narrower —
 * about 225px plus a 16px margin on a phone — so the same seconds-per-card
 * would visibly outrun them. 7.5s a card puts this at the same 32px/s, which is
 * what makes the two read as one system rather than two carousels.
 */
const RAIL_DURATION = `${(SHOTS.length * 7.5).toFixed(1)}s`;

/**
 * One card, shared by the rail and the row.
 *
 * Extracted when mobile gained the marquee: a marquee needs its items
 * duplicated and the row must not have them, so the two are separate subtrees —
 * but the card itself has to stay one definition or they drift on hover, on
 * shadow, on the expand button's position.
 */
function ShotCard({ shot, onOpen }: { shot: Shot; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Read the full message"
      className="lego-hover-sm group relative block h-full w-full overflow-hidden rounded-2xl border"
      style={{
        borderColor: C.line,
        background: C.white,
        boxShadow: '0 18px 40px -28px rgba(0,32,98,0.45)',
      }}
    >
      {/* SIZED, NOT `fill`, and pointed at the pre-cut card file.

          With `fill` the browser resolved `sizes` against a container whose
          width came from an inline aspect-ratio it had not computed yet, fell
          back to the viewport, and asked for the 3840px variant — an upscale of
          an 840px source, which the WASM optimiser then ground away on while
          the card sat blank.

          Real width and height plus a file that is already the right size
          removes both halves of that. The container carries the same ratio as
          the image, so object-cover crops nothing. */}
      <Image
        src={shot.card}
        alt={shot.alt}
        width={shot.width}
        height={shot.height}
        unoptimized
        className="h-full w-full object-cover"
      />

      {/* Expand, bottom right. It replaces a dark gradient and a "Read it"
          label that together covered the last quarter of every card — the
          affordance was sitting on the content it was advertising. */}
      <span
        aria-hidden
        className="absolute bottom-2.5 right-2.5 grid h-8 w-8 place-items-center rounded-full transition-transform duration-300 group-hover:scale-110 group-active:scale-95"
        style={{
          background: C.blueFill,
          boxShadow: '0 6px 16px -6px rgba(0,32,98,0.6)',
        }}
      >
        <ArrowsOutSimple weight="bold" className="h-4 w-4 text-white" />
      </span>
    </button>
  );
}

export default function WhatsappWall() {
  const [open, setOpen] = useState<Shot | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(null), []);

  /* Escape closes, focus lands on the close button, and the page behind stops
     scrolling — without the lock a swipe on the backdrop scrolls the article
     underneath the image being read. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  /* Nothing to show is not an empty section with a heading over it — the whole
     block stands down until there is a real screenshot to put in it. */
  if (SHOTS.length === 0) return null;

  return (
    <div className="mt-16 sm:mt-20">
      {/* WhatsApp green rather than the page's blue eyebrow. This block is the
          one place on the site quoting another product's interface, and the
          green is what makes the row below read as WhatsApp before a single
          word is processed. */}
      <div className="flex justify-center">
        <span
          data-lego=""
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em]"
          style={{ background: C.greenBed, color: C.greenInk }}
        >
          <WhatsappLogo weight="fill" className="h-3.5 w-3.5" />
          From the group
        </span>
      </div>

      <h3
        data-lego=""
        className="mx-auto mt-3 max-w-[620px] text-balance text-center font-heading text-[clamp(21px,3vw,30px)] font-bold leading-tight"
        style={{ color: C.ink }}
      >
        What they message Atul{' '}
        <span style={{ color: C.goldDeep }}>afterwards</span>
      </h3>

      <p
        className="mx-auto mt-3 max-w-[460px] text-center text-[13.5px] leading-relaxed"
        style={{ color: C.inkMuted }}
      >
        Messages from the participant group. Tap any one to read it in full.
      </p>

      {/* ══ MOBILE · one continuously sliding rail ════════════════════
          The same marquee the video testimonials use — `.tst-rail` and
          `.tst-marq` from globals.css, not a second implementation — so the two
          share one set of timings and easing and cannot drift apart. The list
          is rendered twice and the track translated -50%, which lands copy two
          where copy one began; every item carries its own trailing margin
          (including the last), or half the track stops equalling one full set
          and the seam drifts a little further every lap.

          It runs FORWARD. The video rail directly above it runs in reverse, so
          this alternates with it rather than marching alongside. */}
      <div className="tst-rail mt-9 sm:hidden" aria-roledescription="carousel">
        <ul
          className="tst-marq flex w-max"
          data-paused={open ? 'true' : 'false'}
          style={{ ['--tst-dur' as string]: RAIL_DURATION }}
        >
          {[...SHOTS, ...SHOTS].map((shot, i) => {
            const clone = i >= SHOTS.length;
            return (
              <li
                key={`${shot.src}-${i}`}
                data-clone={clone ? 'true' : 'false'}
                aria-hidden={clone || undefined}
                className="mr-4 h-[400px] shrink-0"
                style={{ aspectRatio: `${shot.width} / ${shot.height}` }}
              >
                <ShotCard shot={shot} onOpen={() => setOpen(shot)} />
              </li>
            );
          })}
        </ul>
      </div>

      {/* ══ TABLET AND UP · the whole set, in one row ═════════════════
          WHOLE SCREENSHOT, NOT A CROP. Every card is the same HEIGHT and takes
          its width from the shot's own proportions, so nothing is cut off and
          the row still lines up — the screenshots are not all the same shape,
          and a fixed width would have letterboxed some and cropped others.

          Cropping to the first few messages was the previous approach. It made
          each card a fragment: the reader saw a chat header and two lines and
          had to open it to learn whether there was anything worth reading. */}
      <ul className="mx-auto mt-9 hidden max-w-[1160px] flex-wrap items-start justify-center gap-4 sm:flex sm:gap-5">
        {SHOTS.map((shot, i) => (
          <li
            key={shot.src}
            data-lego=""
            /* Stepped so the four stay on ONE row at each breakpoint. Width is
               derived from height here, so the row's total width is a function
               of this number: at 500px tall the four came to 1131px and wrapped
               the last one onto a line of its own below 1160. */
            className="h-[380px] lg:h-[420px] xl:h-[500px]"
            style={{ ...legoBrick(i, 90), aspectRatio: `${shot.width} / ${shot.height}` }}
          >
            <ShotCard shot={shot} onOpen={() => setOpen(shot)} />
          </li>
        ))}
      </ul>

      {/* ══ lightbox · every width ═══════════════════════════════════
          Not sm:hidden like the video modal. A wall of chat text is unreadable
          in a 190px card on a 27-inch monitor just as much as on a phone, so
          this one opens everywhere. */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="WhatsApp message"
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,12,38,0.975)' }}
          onClick={close}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close message"
            className="absolute right-4 grid h-11 w-11 place-items-center rounded-full"
            style={{
              top: 'calc(env(safe-area-inset-top) + 16px)',
              background: 'rgba(255,255,255,0.16)',
              color: '#FFFFFF',
            }}
          >
            <X weight="bold" className="h-5 w-5" />
          </button>

          {/* A DEFINITE height with the shot's own ratio, so the width follows
              from it. An auto-sized image inside a shrink-wrapping flex item
              has nothing to resolve against and collapses to 0 × 0 — which is
              exactly what this did before the box was given real geometry.
              max-width keeps it inside a narrow phone; object-contain absorbs
              the ratio mismatch if that clamp ever bites. */}
          <div
            /* Stops a tap on the image itself closing the sheet. */
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-[92vw] overflow-hidden rounded-2xl"
            style={{
              height: 'calc(100dvh - 120px)',
              aspectRatio: `${open.width} / ${open.height}`,
            }}
          >
            {/* UNOPTIMIZED, deliberately. Every other image on the site goes
                through the optimiser, but this one opens on a tap and the
                optimiser's first request for a new variant took about three
                seconds — which is the whole life of the interaction. The modal
                sat empty, which is exactly what it looked like: broken.

                It also came back at 420px natural for a 552px box, so the
                message was upscaled and soft at the one moment it has to be
                legible.

                Serving the file straight solves both. These sources were resized
                to 840px wide and re-encoded from ~1.5MB PNGs down to ~140KB
                JPEGs, so they are already about the size the optimiser would
                have produced — there is nothing left for it to save. */}
            <Image
              src={open.src}
              alt={open.alt}
              fill
              unoptimized
              className="object-contain"
              priority
            />

          </div>
        </div>
      )}
    </div>
  );
}

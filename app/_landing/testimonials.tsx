'use client';

/**
 * Section 2 · client testimonials (PDF p6).
 *
 * FIRST SECTION UNDER THE HERO. It was sixth, behind the schedule and the
 * sessions band; the proof now runs before the explanation. See the note at
 * the render site in below-fold.tsx.
 *
 * Lifted out of below-fold.tsx when it grew from three clips to five and from
 * one layout to two. Same reasoning as ./bonuses: this is a self-contained
 * piece of the page with its own state, and it does not belong inside a
 * 1,600-line file.
 *
 * ── ALL FIVE ARE ON VIMEO, AND THAT IS LOAD-BEARING ─────────────────────────
 * The first three used to be .mp4 files on Vercel Blob, streamed in full to
 * every visitor who pressed play. Three portrait clips is a lot of megabytes
 * per view, it is billed as Blob data transfer, and it was the single largest
 * consumer of that quota on the account. Vimeo does the same job with adaptive
 * bitrate, its own CDN, and no per-view cost to us.
 *
 * DO NOT PUT THEM BACK ON BLOB. The two clips added later were Vimeo from the
 * start, so the section is now one source throughout.
 *
 * ── EVERY CARD IS A FACADE UNTIL IT IS CLICKED ──────────────────────────────
 * No <iframe> is mounted on load. Cards show a still and a play button, and
 * the real player replaces it on click.
 *
 * This is stronger than the `loading="lazy"` it replaces, and the difference
 * grew with the section. A Vimeo iframe is roughly a megabyte of player before
 * a single frame of video; lazy defers that until the reader scrolls near,
 * which on a section this far down the page they usually do — so five of them
 * still land, and cost more than the rest of the page put together. A facade
 * costs one JPEG and loads a player only for a clip somebody actually chose.
 *
 * The stills are pulled from Vimeo's own CDN into public/testimonials rather
 * than hotlinked, so the page makes NO third-party image request. The privacy
 * policy lists exactly who sees a visitor's data and Vimeo is not on it, which
 * is the same reason every embed below carries dnt=1.
 *
 * ── DESKTOP AND PHONE DIVERGE, ON PURPOSE ───────────────────────────────────
 * Desktop plays IN THE CARD. There is room for a portrait clip in a
 * three-across grid, so a modal would darken the page to show something the
 * same size as what it covered.
 *
 * Phones play in a MODAL, because a card in the rail is roughly 240px wide and
 * a talking head at that size is not watchable. The modal is also what makes
 * the auto-scrolling rail acceptable: tapping a moving target to start
 * something that then plays in that same moving target would be miserable.
 *
 * Both layouts are rendered and CSS decides which is visible. A JS media query
 * would mean either a wrong first paint or a layout that pops after hydration,
 * and the facades are cheap enough that having both in the DOM costs almost
 * nothing.
 */

import { Play, X } from '@phosphor-icons/react/dist/ssr';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { legoBrick } from './lego-style';
import { C, SectionHeading } from './shared';

type Clip = {
  /** Vimeo's numeric id. Also the key, and the poster's filename. */
  videoId: string;
  /** Accessible name for the card and the modal. */
  name: string;
  poster: string;
};

/**
 * The September batch — EIGHT clips, and the first thing in the section.
 *
 * Placed above the original five because they are the newer and larger set,
 * and because a reader who watches one clip and scrolls on should have watched
 * one of these.
 *
 * ORDER IS THE UPLOADER'S, NOT THE ORDER THEY WERE HANDED OVER IN. The eight
 * are titled "1" to "8" on Vimeo and arrived in roughly reverse; they are
 * sequenced here by those titles, on the assumption that somebody numbered
 * them for a reason. Change the array if the intended running order differs.
 */
const NEW_TESTIMONIALS: Clip[] = [
  { videoId: '1225866642', name: 'Client testimonial 6', poster: '/testimonials/vimeo-1225866642.jpg' },
  { videoId: '1225866643', name: 'Client testimonial 7', poster: '/testimonials/vimeo-1225866643.jpg' },
  { videoId: '1225866645', name: 'Client testimonial 8', poster: '/testimonials/vimeo-1225866645.jpg' },
  { videoId: '1225866644', name: 'Client testimonial 9', poster: '/testimonials/vimeo-1225866644.jpg' },
  { videoId: '1225866709', name: 'Client testimonial 10', poster: '/testimonials/vimeo-1225866709.jpg' },
  { videoId: '1225866708', name: 'Client testimonial 11', poster: '/testimonials/vimeo-1225866708.jpg' },
  { videoId: '1225866710', name: 'Client testimonial 12', poster: '/testimonials/vimeo-1225866710.jpg' },
  { videoId: '1225866815', name: 'Client testimonial 13', poster: '/testimonials/vimeo-1225866815.jpg' },
];

/**
 * Order is the running order on the page: three across, then two centred.
 *
 * The first three are the clips the page was signed off with, so a reader who
 * watches only the top row sees those.
 */
const TESTIMONIALS: Clip[] = [
  { videoId: '1220112152', name: 'Client testimonial 1', poster: '/testimonials/vimeo-1220112152.jpg' },
  { videoId: '1220112153', name: 'Client testimonial 2', poster: '/testimonials/vimeo-1220112153.jpg' },
  { videoId: '1220112154', name: 'Client testimonial 3', poster: '/testimonials/vimeo-1220112154.jpg' },
  { videoId: '1220752306', name: 'Client testimonial 4', poster: '/testimonials/vimeo-1220752306.jpg' },
  { videoId: '1220752305', name: 'Client testimonial 5', poster: '/testimonials/vimeo-1220752305.jpg' },
];

/**
 * Seconds of travel per card, so every rail moves at the same speed.
 *
 * The original rail was 46s for five cards. That ratio is now the constant and
 * each rail multiplies it by its own length — see .sm-testi-track in
 * globals.css for why two rails at different speeds is the thing to avoid.
 */
const RAIL_SECONDS_PER_CARD = 46 / 5;

function railDuration(cards: number): string {
  return `${Math.round(cards * RAIL_SECONDS_PER_CARD)}s`;
}

/** Desktop running order: the newer eight, then the original five. */
const DESKTOP_WALL: Clip[] = [...NEW_TESTIMONIALS, ...TESTIMONIALS];

/** Cards per row in the desktop grid. */
const PER_ROW = 4;

/**
 * Where the last row starts so that it centres.
 *
 * The grid is EIGHT columns with every card spanning two, which is what makes
 * a short final row centrable at all — a 4-column grid cannot centre three
 * items without either this arithmetic or a flex wrapper that then loses
 * alignment with the rows above.
 *
 * Written out per remainder rather than computed, because Tailwind's JIT only
 * sees literal class strings and would emit none of these if they were built
 * from a number at runtime.
 */
const LAST_ROW_START: Record<number, string> = {
  0: '',
  1: 'col-start-4',
  2: 'col-start-3',
  3: 'col-start-2',
};

/**
 * Vimeo embed URL.
 *
 * `dnt=1` is not optional on this site. Without it the Vimeo player sets its
 * own analytics cookies, which would put a third party's tracking on a page
 * whose privacy policy names exactly who sees a visitor's data — and Vimeo is
 * not on that list.
 *
 * title/byline/portrait off strips the uploader chrome, which on these clips
 * reads "VID-20260805-WA0009.mp4" over a stranger's avatar.
 */
function vimeoSrc(videoId: string, autoplay: boolean): string {
  const p = new URLSearchParams({
    dnt: '1',
    title: '0',
    byline: '0',
    portrait: '0',
    badge: '0',
    autopause: '0',
    playsinline: '1',
  });
  if (autoplay) p.set('autoplay', '1');
  return `https://player.vimeo.com/video/${videoId}?${p.toString()}`;
}

/**
 * The card's aspect, in one place because two layouts and the modal all need
 * to agree.
 *
 * 9/14 is a COMPROMISE and worth knowing about before anyone "fixes" it. Four
 * of the five clips are 9:16 (0.563) and the fifth is 3:4 (0.750). No single
 * frame fits all of them, so 9/14 (0.643) sits between the two and splits the
 * difference: every clip letterboxes a little, none letterboxes badly.
 * Matching 9:16 exactly would give four perfect cards and one with thick bars
 * down both sides.
 */
const CARD_ASPECT = 'aspect-[9/14]';

/** The circular play control that sits over every still. */
function PlayBadge() {
  return (
    <span
      className="grid h-14 w-14 place-items-center rounded-full transition-transform duration-200 group-hover:scale-105"
      style={{
        background: 'rgba(255,255,255,0.92)',
        boxShadow: '0 8px 26px -8px rgba(0,32,98,0.55)',
      }}
    >
      {/* Nudged right by a hair: a triangle centred on its bounding box reads
          as sitting left of centre, because its visual mass is not where its
          box is. */}
      <Play
        weight="fill"
        className="h-5 w-5 translate-x-[1px]"
        style={{ color: C.blueFill }}
      />
    </span>
  );
}

/** Poster + play badge. Identical in both layouts, so a card looks the same
    whether it is about to play in place or open a modal. */
function Facade({ clip }: { clip: Clip }) {
  return (
    <>
      <Image
        src={clip.poster}
        alt=""
        fill
        sizes="(max-width: 639px) 240px, 340px"
        className="object-cover"
      />
      {/* A wash under the badge. Without it the play control lands on whatever
          the first frame happens to be — sometimes a white wall, sometimes a
          face — and disappears against the light ones. */}
      <span
        aria-hidden
        className="absolute inset-0 grid place-items-center"
        style={{ background: 'rgba(0,32,98,0.16)' }}
      >
        <PlayBadge />
      </span>
    </>
  );
}

/* ══ desktop card · plays in place ═══════════════════════════════════════ */

function DesktopCard({ clip, idx }: { clip: Clip; idx: number }) {
  const [live, setLive] = useState(false);

  return (
    <div
      data-lego=""
      /* No hover lift. Once this is playing the card IS the player, and moving
         it under the cursor fights the scrub bar the reader is aiming at.
         Entrance animation only. */
      className={`relative ${CARD_ASPECT} overflow-hidden rounded-2xl border`}
      style={{ ...legoBrick(idx, 110), borderColor: C.line, background: C.black }}
    >
      {live ? (
        <iframe
          src={vimeoSrc(clip.videoId, true)}
          title={clip.name}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setLive(true)}
          aria-label={`Play ${clip.name}`}
          className="group absolute inset-0 h-full w-full cursor-pointer"
        >
          <Facade clip={clip} />
        </button>
      )}
    </div>
  );
}

/* ══ phone card · opens the modal ════════════════════════════════════════ */

function RailCard({
  clip,
  onOpen,
  duplicate = false,
}: {
  clip: Clip;
  onOpen: (clip: Clip) => void;
  duplicate?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(clip)}
      aria-label={`Play ${clip.name}`}
      /* The duplicate copy is hidden from assistive tech: it is the same five
         testimonials again, and a screen reader announcing ten is wrong. It
         stays clickable for anyone who taps what they can see. */
      aria-hidden={duplicate || undefined}
      tabIndex={duplicate ? -1 : undefined}
      className={[
        'sm-testi-card group relative w-[240px] shrink-0 overflow-hidden rounded-2xl border',
        CARD_ASPECT,
        duplicate ? 'sm-testi-dup' : '',
      ].join(' ')}
      style={{ borderColor: C.line, background: C.black }}
    >
      <Facade clip={clip} />
    </button>
  );
}

/* ══ modal ═══════════════════════════════════════════════════════════════ */

function ClipModal({ clip, onClose }: { clip: Clip; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    /* Where focus was before the modal took it, so it can be handed back.
       Without this, closing drops focus to the top of the document and a
       keyboard reader has to tab through the whole page again. */
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    /* The page behind must not scroll under the overlay. Restored to whatever
       it was rather than hard-set to '', so this cannot clobber a lock some
       other component set. */
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={clip.name}
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,16,45,0.92)' }}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close video"
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full"
        style={{ background: 'rgba(255,255,255,0.14)', color: '#FFFFFF' }}
      >
        <X weight="bold" className="h-5 w-5" />
      </button>

      {/* Stops a tap on the player itself from closing the sheet, while a tap
          anywhere on the backdrop still does. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[440px] overflow-hidden rounded-2xl"
        style={{ aspectRatio: '9 / 16', background: '#000000' }}
      >
        {/* autoplay is allowed here because opening this modal WAS the tap —
            the user gesture that mobile autoplay policy requires. */}
        <iframe
          src={vimeoSrc(clip.videoId, true)}
          title={clip.name}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  );
}

/* ══ section ═════════════════════════════════════════════════════════════ */

export default function Testimonials() {
  const [open, setOpen] = useState<Clip | null>(null);
  const [held, setHeld] = useState(false);

  const close = useCallback(() => setOpen(null), []);

  return (
    <section className="overflow-hidden px-4 py-16 sm:py-24" style={{ background: C.white }}>
      <SectionHeading sub="From working professionals and busy parents to people who had stopped moving the way they used to, these are real people who used the Inner Brace Method to improve their mobility, build strength and move with greater ease.">
        {/* Three deliberate lines on desktop, broken on sense rather than
            wherever the measure happens to run out. Below lg the breaks are
            display:none, so the headline wraps naturally on a phone. */}
        Real People Who Refused To Let
        <br className="hidden lg:inline" /> Pain Decide What They
        <br className="hidden lg:inline" />{' '}
        <span style={{ color: C.goldDeep }}>Could &amp; Couldn&apos;t Do</span>
      </SectionHeading>

      {/* ══ desktop · one wall, four across ══════════════════════════════
          ALL THIRTEEN IN ONE GRID, newer eight first. The eight were first
          built as their own 4-across block above the original 3-across five,
          and the two card sizes sat badly together: the older five read as
          featured and the newer eight as an afterthought, which is the
          opposite of the running order. One density, one card size, one wall
          — and it is about 800px shorter than the two-block version, which on
          a section of thirteen portrait clips is the difference between a
          proof wall and a scroll.

          EIGHT columns with every card spanning two. That is what lets a
          short last row centre; see LAST_ROW_START. */}
      <ul className="mx-auto mt-11 hidden max-w-[1080px] grid-cols-8 gap-5 sm:grid">
        {DESKTOP_WALL.map((clip, idx) => {
          const remainder = DESKTOP_WALL.length % PER_ROW;
          const firstOfLastRow =
            remainder === 0 ? -1 : DESKTOP_WALL.length - remainder;
          return (
            <li
              key={clip.videoId}
              className={`col-span-2 ${idx === firstOfLastRow ? LAST_ROW_START[remainder] : ''}`}
            >
              <DesktopCard clip={clip} idx={idx} />
            </li>
          );
        })}
      </ul>

      {/* ══ phone · the September eight, own rail ═════════════════════════
          A SECOND rail above the original, not eight cards appended to it.
          One rail of thirteen takes over two minutes to come back round, so a
          reader who glances at it twice sees the same card and concludes it
          is not moving. Two rails also let the newer set lead on a phone the
          same way it leads on a desktop.

          Identical card, identical gap, identical speed — only the duration
          differs, and it differs precisely so that the speed does not.

          This one runs right-to-left; the rail below runs left-to-right. Two
          strips travelling the same way at the same speed read as one sheet
          sliding behind a mask, which hides that there are two sets to look
          at. Opposing directions make each rail its own object. */}
      <div
        className="sm-testi-viewport -mx-4 mt-10 sm:hidden"
        style={{ ['--rail-duration' as string]: railDuration(NEW_TESTIMONIALS.length) }}
      >
        <div
          className="sm-testi-track gap-4 px-4"
          data-paused={open !== null || held ? 'true' : 'false'}
          onTouchStart={() => setHeld(true)}
          onTouchEnd={() => setHeld(false)}
          onTouchCancel={() => setHeld(false)}
        >
          {NEW_TESTIMONIALS.map((clip) => (
            <RailCard key={clip.videoId} clip={clip} onOpen={setOpen} />
          ))}
          {NEW_TESTIMONIALS.map((clip) => (
            <RailCard key={`dup-${clip.videoId}`} clip={clip} onOpen={setOpen} duplicate />
          ))}
        </div>
      </div>

      {/* ══ phone · the original five, second rail ═══════════════════════
          Full-bleed: the rail is pulled out to the viewport edges so cards
          enter and leave the screen rather than appearing at a margin, which
          is what makes it read as continuous travel.

          Two copies of the list. The track is animated to -50%, so at the end
          of a cycle copy two sits exactly where copy one started and the jump
          back to 0 is invisible. See .sm-testi-track in globals.css. */}
      <div
        /* mt-4 is the card gap, so the two rails read as one stacked strip.
           The duration is derived rather than left to the CSS default for the
           same reason the rail above sets one: the constant lives in one
           place and neither rail can drift from the other. */
        className="sm-testi-viewport -mx-4 mt-4 sm:hidden"
        style={{ ['--rail-duration' as string]: railDuration(TESTIMONIALS.length) }}
      >
        <div
          /* -rev is the only difference from the rail above: this one travels
             left-to-right. See .sm-testi-track-rev in globals.css. */
          className="sm-testi-track sm-testi-track-rev gap-4 px-4"
          data-paused={open !== null || held ? 'true' : 'false'}
          onTouchStart={() => setHeld(true)}
          onTouchEnd={() => setHeld(false)}
          onTouchCancel={() => setHeld(false)}
        >
          {TESTIMONIALS.map((clip) => (
            <RailCard key={clip.videoId} clip={clip} onOpen={setOpen} />
          ))}
          {TESTIMONIALS.map((clip) => (
            <RailCard key={`dup-${clip.videoId}`} clip={clip} onOpen={setOpen} duplicate />
          ))}
        </div>
      </div>

      {open && <ClipModal clip={open} onClose={close} />}
    </section>
  );
}

'use client';

/**
 * Client testimonial clips — thirteen of them, all hosted on Vimeo.
 *
 * WHY NOT VERCEL BLOB
 * The first three used to be .mp4 files on Vercel Blob, streamed in full to
 * every visitor who pressed play. Portrait clips are a lot of megabytes per
 * view, it is billed as Blob data transfer, and they were the single largest
 * consumer of that quota on the account. Vimeo does the same job with adaptive
 * bitrate, its own CDN, and no per-view cost to us. Nothing goes back on Blob.
 *
 * THE FACADE
 * A Vimeo embed is a whole extra document, and thirteen of them below the fold
 * is thirteen documents the reader has not asked for — `loading="lazy"` defers
 * that cost but does not remove it, since scrolling past the section is enough
 * to trigger every one. So no iframe exists until a card is activated. Until
 * then each card is a still frame and our own play button, which also means the
 * player chrome never gets a chance to disagree with the rest of the page.
 *
 * That matters more at thirteen than it did at five: this is the difference
 * between one section and thirteen extra documents on the page.
 *
 * The stills live in /public/testimonials rather than hot-linked from Vimeo's
 * CDN — those URLs carry a rotating hash and are not a contract.
 *
 * TWO ARRAYS, AND WHERE THAT SHOWS
 * The original five and the eight that followed are separate arrays because
 * that is how they arrived. The DESKTOP GRID IGNORES THE SPLIT and lays all
 * thirteen out as one run: two grids meant two short centred rows, one of them
 * stranded in the middle of the section, which broke the three-across rhythm
 * exactly where the eye was settling into it. One grid has a single short row,
 * at the end, where a short row belongs.
 *
 * The split still drives the MOBILE RAILS, which are genuinely two objects.
 *
 * TWO LAYOUTS, TWO BEHAVIOURS
 *   >= sm  one grid, three across, the final row centred, and a tapped clip
 *          plays IN ITS OWN FRAME. Nothing covers the page.
 *   <  sm  two continuously sliding rails running in OPPOSITE directions, and a
 *          tapped clip opens FULL SCREEN and starts immediately. A 9:14 card
 *          inside a moving rail is too small to watch in place.
 *
 * The two are separate subtrees rather than one CSS-switched list, because a
 * marquee needs its items duplicated and a grid must not have them. Only one is
 * ever displayed, so only one is ever in the accessibility tree.
 */
import { Play, X } from '@phosphor-icons/react/dist/ssr';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { legoBrick } from './lego-style';
import { C, SectionHeading } from './shared';
import WhatsappWall from './whatsapp-wall';

type Clip = { name: string; id: string; poster: string };

/** The original five. */
const CLIPS: Clip[] = [
  { name: 'Client story 1', id: '1220112152', poster: '/testimonials/vimeo-1220112152.jpg' },
  { name: 'Client story 2', id: '1220112153', poster: '/testimonials/vimeo-1220112153.jpg' },
  { name: 'Client story 3', id: '1220112154', poster: '/testimonials/vimeo-1220112154.jpg' },
  { name: 'Client story 4', id: '1220752306', poster: '/testimonials/vimeo-1220752306.jpg' },
  { name: 'Client story 5', id: '1220752305', poster: '/testimonials/vimeo-1220752305.jpg' },
];

/** The eight added afterwards. Second rail on mobile; same grid on desktop. */
const MORE_CLIPS: Clip[] = [
  { name: 'Client story 6', id: '1225866815', poster: '/testimonials/vimeo-1225866815.jpg' },
  { name: 'Client story 7', id: '1225866710', poster: '/testimonials/vimeo-1225866710.jpg' },
  { name: 'Client story 8', id: '1225866709', poster: '/testimonials/vimeo-1225866709.jpg' },
  { name: 'Client story 9', id: '1225866708', poster: '/testimonials/vimeo-1225866708.jpg' },
  { name: 'Client story 10', id: '1225866645', poster: '/testimonials/vimeo-1225866645.jpg' },
  { name: 'Client story 11', id: '1225866642', poster: '/testimonials/vimeo-1225866642.jpg' },
  { name: 'Client story 12', id: '1225866643', poster: '/testimonials/vimeo-1225866643.jpg' },
  { name: 'Client story 13', id: '1225866644', poster: '/testimonials/vimeo-1225866644.jpg' },
];

/** One run for the desktop grid — see the note on the split at the top. */
const ALL_CLIPS: Clip[] = [...CLIPS, ...MORE_CLIPS];

/**
 * Seconds per rail, derived from how many cards it carries.
 *
 * NOT a fixed duration for both. The animation translates the track by 50% of
 * its own width, so a fixed duration would make the eight-card rail travel more
 * pixels in the same time and visibly outrun the five-card one above it. Scaling
 * the duration with the count keeps both moving at the same speed, which is what
 * "consistent" actually looks like when the two are on screen together.
 */
const SECONDS_PER_CARD = 9.2;
const railDuration = (count: number) => `${(count * SECONDS_PER_CARD).toFixed(1)}s`;

/* dnt=1 asks Vimeo not to track the viewer — it costs nothing, and this page
   already carries a Pixel and GA; a third tracker nobody chose is not needed.
   The chrome flags strip Vimeo's branding so the player reads as part of the
   page rather than as an embed. autoplay is safe to ask for here because the
   iframe only ever mounts in response to a tap. */
function vimeoSrc(id: string) {
  return `https://player.vimeo.com/video/${id}?badge=0&byline=0&portrait=0&title=0&dnt=1&playsinline=1&autoplay=1`;
}

/* ── the still + play button every card shows before it is asked ────── */
function Facade({
  clip,
  onActivate,
  eager,
}: {
  clip: Clip;
  onActivate: () => void;
  eager?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label={`Play ${clip.name}`}
      className="group relative block h-full w-full cursor-pointer overflow-hidden"
    >
      <Image
        src={clip.poster}
        alt=""
        fill
        sizes="(max-width: 640px) 72vw, 340px"
        className="object-cover"
        priority={false}
        loading={eager ? 'eager' : 'lazy'}
      />

      {/* A soft floor behind the button so it survives a bright first frame. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,32,98,0.10) 0%, rgba(0,32,98,0) 38%, rgba(0,32,98,0.34) 100%)',
        }}
      />

      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-transform duration-300 group-hover:scale-110 group-active:scale-95"
        style={{
          background: 'rgba(255,255,255,0.94)',
          boxShadow: '0 10px 26px -10px rgba(0,32,98,0.55)',
        }}
      >
        <Play weight="fill" className="ml-0.5 h-5 w-5" style={{ color: C.blueFill }} />
      </span>
    </button>
  );
}

/* ── the live player, once a card has been activated ─────────────────── */
function Player({ clip }: { clip: Clip }) {
  return (
    <iframe
      src={vimeoSrc(clip.id)}
      title={clip.name}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      className="absolute inset-0 h-full w-full border-0"
    />
  );
}

/* ── the card shell, shared by both layouts ──────────────────────────── */
function cardStyle(): React.CSSProperties {
  return { borderColor: C.line, background: C.sand };
}

/**
 * Where a short final row has to start so it sits centred.
 *
 * The grid is six columns with every card spanning two, which is visually a
 * three-column grid but leaves a half-column offset to place against. A plain
 * three-column grid cannot centre a short row at all: centring two items across
 * three tracks needs fractional placement.
 *
 *   remainder 2 → start the pair at column 2, filling columns 2–5
 *   remainder 1 → start the single at column 3, filling columns 3–4
 *
 * Derived rather than hard-coded, so adding or removing a clip cannot strand
 * one against the left edge.
 */
function orphanOffset(count: number, idx: number): string {
  const rem = count % 3;
  if (rem === 0 || idx !== count - rem) return '';
  return rem === 2 ? 'sm:col-start-2' : 'sm:col-start-3';
}

/* ── one desktop grid ────────────────────────────────────────────────── */
function Grid({
  clips,
  className = '',
  inFrame,
  onActivate,
}: {
  clips: Clip[];
  className?: string;
  inFrame: string | null;
  onActivate: (name: string) => void;
}) {
  return (
    <ul
      className={`mx-auto hidden max-w-[1080px] gap-5 sm:grid sm:grid-cols-6 ${className}`}
    >
      {clips.map((clip, idx) => (
        <li
          key={clip.name}
          data-lego=""
          /* No hover lift. Once activated the card IS the video player, and
             moving it under the cursor fights the scrub bar the reader is
             aiming at. Entrance animation only. */
          className={`relative aspect-[9/14] overflow-hidden rounded-2xl border sm:col-span-2 ${orphanOffset(
            clips.length,
            idx,
          )}`}
          style={{ ...legoBrick(idx, 110), ...cardStyle() }}
        >
          {inFrame === clip.name ? (
            <Player clip={clip} />
          ) : (
            <Facade clip={clip} onActivate={() => onActivate(clip.name)} />
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * One mobile rail.
 *
 * The list is rendered twice and the track is translated by exactly -50%, which
 * lands copy two where copy one began — a seamless loop with no reset jump. For
 * that to work every item must carry its own trailing margin (including the
 * last), or half the track width does not equal one full set and the seam
 * drifts a little further every lap.
 *
 * `reverse` flips the travel direction by reversing the same animation rather
 * than defining a second keyframe set, so the two rails can never fall out of
 * step on timing, easing or distance — only on direction, which is the point.
 */
function Rail({
  clips,
  reverse = false,
  paused,
  eager = false,
  className = '',
  onActivate,
}: {
  clips: Clip[];
  reverse?: boolean;
  paused: boolean;
  /** Only the first rail preloads; the second is a screen further down. */
  eager?: boolean;
  className?: string;
  onActivate: (clip: Clip) => void;
}) {
  return (
    <div className={`tst-rail sm:hidden ${className}`} aria-roledescription="carousel">
      <ul
        className="tst-marq flex w-max"
        data-paused={paused ? 'true' : 'false'}
        data-dir={reverse ? 'reverse' : 'forward'}
        style={{ ['--tst-dur' as string]: railDuration(clips.length) }}
      >
        {[...clips, ...clips].map((clip, i) => {
          const clone = i >= clips.length;
          return (
            <li
              key={`${clip.name}-${i}`}
              data-clone={clone ? 'true' : 'false'}
              aria-hidden={clone || undefined}
              className="mr-4 aspect-[9/14] w-[72vw] max-w-[300px] shrink-0 overflow-hidden rounded-2xl border"
              style={cardStyle()}
            >
              <Facade
                clip={clip}
                eager={eager && i < 2}
                onActivate={() => onActivate(clip)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Testimonials() {
  /* Desktop: which card is playing in place. Mobile: which clip is full screen.
     Deliberately separate — a reader who opens the modal, closes it and then
     rotates to landscape should not find a card silently mid-play. */
  const [inFrame, setInFrame] = useState<string | null>(null);
  const [modal, setModal] = useState<Clip | null>(null);

  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setModal(null), []);

  /* Escape closes, focus lands on the close button, and the page behind stops
     scrolling — without the lock, a swipe on the backdrop scrolls the article
     underneath while a video is playing over it.

     The resize listener is not decoration. The overlay is `sm:hidden`, so a
     phone turned to landscape past 640px would hide it by CSS while the state
     stayed set — leaving the reader on a page that is still scroll-locked with
     nothing on screen explaining why. Crossing the breakpoint closes it. */
  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const mq = window.matchMedia('(min-width: 640px)');
    const onWide = () => {
      if (mq.matches) close();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onWide);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onWide);
    };
  }, [modal, close]);

  /* Both rails stop behind a full-screen video — pointless work, and they are
     what the reader returns to. */
  const railPaused = modal !== null;

  return (
    /* Pale blue, not white. This section moved up to sit directly under the
       hero, which is white, and a white section against a white hero has no
       edge at all — the proof would read as more hero. The section below it is
       white again, so the page keeps alternating. */
    <section className="px-4 py-16 sm:py-24" style={{ background: C.canvas }}>
      <SectionHeading sub="From working professionals and busy parents to people who had stopped moving the way they used to, these are real people who used the Inner Brace Method to improve their mobility, build strength and move with greater ease.">
        {/* Three deliberate lines on desktop, broken on sense rather than
            wherever the measure happens to run out. Below lg the breaks are
            display:none, so the headline wraps naturally on a phone. */}
        Real People Who Refused To Let
        <br className="hidden lg:inline" /> Pain Decide What They
        <br className="hidden lg:inline" />{' '}
        <span style={{ color: C.goldDeep }}>Could &amp; Couldn&apos;t Do</span>
      </SectionHeading>

      {/* ══ MOBILE · two rails, travelling in opposite directions ═════
          Opposed directions rather than two rails sliding the same way: two
          parallel rails moving together read as one tall block drifting
          sideways, and the eye stops separating them. Countermotion keeps them
          legible as two rows. Same card size, same gap, same speed — only the
          direction differs. */}
      <Rail
        className="mt-10"
        clips={CLIPS}
        paused={railPaused}
        eager
        onActivate={setModal}
      />
      <Rail
        className="mt-4"
        clips={MORE_CLIPS}
        reverse
        paused={railPaused}
        onActivate={setModal}
      />

      <p className="mt-4 text-center text-[12.5px] sm:hidden" style={{ color: C.inkMuted }}>
        Tap a story to watch it
      </p>

      {/* ══ DESKTOP · ONE grid, three across, last row centred ═══════
          All thirteen in a single run: 3 · 3 · 3 · 3, then one centred. Split
          into two grids it read as two sections, because each one ended on its
          own short centred row and the second of those landed mid-section —
          a gap at exactly the point the three-across rhythm had been
          established. One run has one short row, at the end. */}
      <Grid
        className="mt-11"
        clips={ALL_CLIPS}
        inFrame={inFrame}
        onActivate={setInFrame}
      />

      {/* ══ the written proof, under the filmed proof ═════════════════
          Same section, not a new one: it is the same claim in a second form,
          and giving it its own masthead and background would make the page
          argue the point twice rather than once with two kinds of evidence. */}
      <WhatsappWall />

      {/* ══ MOBILE · full-screen player ═══════════════════════════════ */}
      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={modal.name}
          className="fixed inset-0 z-[100] flex items-center justify-center sm:hidden"
          /* Near-opaque, not a light scrim. At 0.92 the docked CTA's blue fill
             read straight through the backdrop and looked like a paint bug
             rather than depth. A video wants a dark room. */
          style={{ background: 'rgba(0,12,38,0.975)' }}
          onClick={close}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close video"
            className="absolute right-4 grid h-11 w-11 place-items-center rounded-full"
            style={{
              /* Clears the notch and the status bar on a modern phone. */
              top: 'calc(env(safe-area-inset-top) + 16px)',
              background: 'rgba(255,255,255,0.16)',
              color: '#FFFFFF',
            }}
          >
            <X weight="bold" className="h-5 w-5" />
          </button>

          <div
            /* Stops a tap on the player itself closing the sheet. */
            onClick={(e) => e.stopPropagation()}
            className="relative aspect-[9/16] w-full max-w-[440px] overflow-hidden rounded-2xl"
            style={{ background: '#000000', maxHeight: 'calc(100dvh - 132px)' }}
          >
            <Player clip={modal} />
          </div>
        </div>
      )}
    </section>
  );
}

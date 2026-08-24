'use client';

/**
 * Client testimonial clips — five of them, from two different sources.
 *
 * TWO SOURCES, ONE CARD
 * Three clips are self-hosted MP4s on object storage; two are Vimeo. Rather
 * than let each source impose its own player chrome, both sit behind the same
 * FACADE: a still frame plus our own play button. Nothing loads a player until
 * the reader asks for one, so the section costs two images and three metadata
 * requests instead of two full Vimeo embeds.
 *
 * The Vimeo stills are stored locally in /public/testimonials rather than
 * hot-linked from Vimeo's CDN — those URLs carry a rotating hash and are not a
 * contract.
 *
 * TWO LAYOUTS, TWO BEHAVIOURS
 *   ≥ sm  a 3 + 2 grid, the second row centred, and a tapped clip plays
 *         IN ITS OWN FRAME. Nothing covers the page.
 *   < sm  a continuously sliding carousel, and a tapped clip opens FULL SCREEN
 *         and starts immediately. A 9:14 card inside a moving rail is too small
 *         to watch in place.
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

const BLOB = 'https://pm4wnvllwxriwvmg.public.blob.vercel-storage.com';

type Clip =
  | { kind: 'file'; name: string; src: string; poster?: string }
  | { kind: 'vimeo'; name: string; id: string; poster: string };

const CLIPS: Clip[] = [
  { kind: 'file', name: 'Client story 1', src: `${BLOB}/testimonial-1.mp4` },
  { kind: 'file', name: 'Client story 2', src: `${BLOB}/testimonial-2.mp4` },
  { kind: 'file', name: 'Client story 3', src: `${BLOB}/testimonial-3.mp4` },
  {
    kind: 'vimeo',
    name: 'Client story 4',
    id: '1220752306',
    poster: '/testimonials/vimeo-1220752306.jpg',
  },
  {
    kind: 'vimeo',
    name: 'Client story 5',
    id: '1220752305',
    poster: '/testimonials/vimeo-1220752305.jpg',
  },
];

/* dnt=1 keeps Vimeo's tracking out; the chrome flags strip its branding so the
   player reads as part of the page rather than as an embed. */
function vimeoSrc(id: string, autoplay: boolean) {
  const q = [
    'dnt=1',
    'title=0',
    'byline=0',
    'portrait=0',
    'playsinline=1',
    autoplay ? 'autoplay=1' : '',
  ]
    .filter(Boolean)
    .join('&');
  return `https://player.vimeo.com/video/${id}?${q}`;
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
      {clip.kind === 'vimeo' ? (
        <Image
          src={clip.poster}
          alt=""
          fill
          sizes="(max-width: 640px) 72vw, 340px"
          className="object-cover"
          priority={false}
          loading={eager ? 'eager' : 'lazy'}
        />
      ) : (
        /* No poster art exists for the self-hosted clips, so the still IS the
           video: preload="metadata" pulls the header and first frame only —
           a few KB — and the browser paints it as an implicit poster. Muted,
           controls-free and aria-hidden, because the button above it is what
           the reader actually operates. */
        <video
          src={clip.src}
          poster={clip.poster}
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          aria-hidden
          className="h-full w-full object-cover"
        />
      )}

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
function Player({ clip, className }: { clip: Clip; className?: string }) {
  if (clip.kind === 'vimeo') {
    return (
      <iframe
        src={vimeoSrc(clip.id, true)}
        title={clip.name}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className={`absolute inset-0 h-full w-full border-0 ${className ?? ''}`}
      />
    );
  }
  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      src={clip.src}
      controls
      autoPlay
      playsInline
      preload="auto"
      aria-label={clip.name}
      className={`h-full w-full object-cover ${className ?? ''}`}
    />
  );
}

/* ── the card shell, shared by both layouts ──────────────────────────── */
function cardStyle(): React.CSSProperties {
  return { borderColor: C.line, background: C.sand };
}

export default function Testimonials() {
  /* Desktop: which card is playing in place. Mobile: which clip is full screen.
     Deliberately separate — a reader who opens the modal, closes it and then
     rotates to landscape should not find a card silently mid-play. */
  const [inFrame, setInFrame] = useState<string | null>(null);
  const [modal, setModal] = useState<Clip | null>(null);

  const railRef = useRef<HTMLUListElement>(null);
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

  /* The rail keeps sliding behind a full-screen video otherwise — pointless
     work, and it is what the reader returns to. */
  const railPaused = modal !== null;

  const heading = (
    <SectionHeading sub="From working professionals and busy parents to people who had stopped moving the way they used to, these are real people who used the Inner Brace Method to improve their mobility, build strength and move with greater ease.">
      {/* Three deliberate lines on desktop, broken on sense rather than
          wherever the measure happens to run out. Below lg the breaks are
          display:none, so the headline wraps naturally on a phone. */}
      Real People Who Refused To Let
      <br className="hidden lg:inline" /> Pain Decide What They
      <br className="hidden lg:inline" />{' '}
      <span style={{ color: C.goldDeep }}>Could &amp; Couldn&apos;t Do</span>
    </SectionHeading>
  );

  return (
    <section className="px-4 py-16 sm:py-24" style={{ background: C.white }}>
      {heading}

      {/* ══ MOBILE · continuously sliding rail ════════════════════════
          The list is rendered twice and the track is translated by exactly
          -50%, which lands copy two where copy one began — a seamless loop
          with no reset jump. For that to work every item must carry its own
          trailing margin (including the last), or half the track width does
          not equal one full set and the seam drifts. */}
      <div className="tst-rail mt-10 sm:hidden" aria-roledescription="carousel">
        <ul
          ref={railRef}
          className="tst-marq flex w-max"
          data-paused={railPaused ? 'true' : 'false'}
        >
          {[...CLIPS, ...CLIPS].map((clip, i) => {
            const clone = i >= CLIPS.length;
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
                  eager={i < 2}
                  onActivate={() => setModal(clip)}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <p
        className="mt-4 text-center text-[12.5px] sm:hidden"
        style={{ color: C.inkMuted }}
      >
        Tap a story to watch it
      </p>

      {/* ══ DESKTOP · 3 + 2, the short row centred ════════════════════
          Six columns with every card spanning two is visually identical to a
          three-column grid, but a half-column offset now exists. Starting the
          fourth card at column 2 puts the pair in columns 2–5 — dead centre.
          A three-column grid cannot do this: centring two items across three
          tracks needs fractional placement. */}
      <ul className="mx-auto mt-11 hidden max-w-[1080px] gap-5 sm:grid sm:grid-cols-6">
        {CLIPS.map((clip, idx) => (
          <li
            key={clip.name}
            data-lego=""
            /* No hover lift. Once activated the card IS the video player, and
               moving it under the cursor fights the scrub bar the reader is
               aiming at. Entrance animation only. */
            className={`relative aspect-[9/14] overflow-hidden rounded-2xl border sm:col-span-2 ${
              idx === 3 ? 'sm:col-start-2' : ''
            }`}
            style={{ ...legoBrick(idx, 110), ...cardStyle() }}
          >
            {inFrame === clip.name ? (
              <Player clip={clip} />
            ) : (
              <Facade clip={clip} onActivate={() => setInFrame(clip.name)} />
            )}
          </li>
        ))}
      </ul>

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
            <Player clip={modal} className="object-contain" />
          </div>
        </div>
      )}
    </section>
  );
}

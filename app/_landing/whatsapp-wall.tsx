'use client';

/**
 * The WhatsApp wall — messages from the group, under the video testimonials.
 *
 * Part A, A3: "a horizontal scroll of screenshots from the September group",
 * titled "From the September group".
 *
 * ── IT AUTO-SCROLLS ON A PHONE AND NOT ON A DESKTOP ─────────────────────────
 * The phone rail matches the two video rails above it: two copies of the list
 * in one track, animated -50%, at the same pixels per second. That was a
 * client decision — the first build made it manual on both, on the grounds
 * that a chat screenshot is text and text under a moving strip cannot be read.
 *
 * What makes the moving version work is the PAUSE. The rail stops while a
 * finger is on it and while the lightbox is open, so the reading position is
 * always one touch away, and the lightbox is where a screenshot is actually
 * read. Without those two pauses this would be a wall of unreadable text.
 *
 * From sm up it stays a manual strip, because there is no thumb to hold a
 * desktop rail still with — and at 1280 all four fit at once, so there is
 * nothing to scroll.
 *
 * ── THE STRIP IS A PREVIEW, THE MODAL IS THE ARTEFACT ───────────────────────
 * A 941px-wide screenshot shown in a 280px card is at 30% scale, which is
 * legible as "a WhatsApp chat" and not as words. That is deliberate and it is
 * enough for the strip's job, which is to convey volume and authenticity at a
 * glance. Anyone who wants to actually read one taps it and gets it full size.
 *
 * ── PRIVACY ─────────────────────────────────────────────────────────────────
 * These are real people's messages. Anything published here shows a name, a
 * profile photo and a health detail together, which under the DPDP Act 2023
 * is personal data the sender has to have agreed to see published. The brief
 * asks for names blurred; see the note on SHOTS below.
 */

import { ArrowsOutSimple, WhatsappLogo, X } from '@phosphor-icons/react/dist/ssr';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { C, railDuration } from './shared';

type Shot = {
  /** Path under /public. */
  src: string;
  /** Accessible name. Describes the message, never the sender. */
  alt: string;
  /** Real pixel size. The lightbox reserves this box, and the shots are not
      all the same shape — a phone screenshot's aspect follows the phone. */
  w: number;
  h: number;
};

/**
 * ── READ THIS BEFORE THE PAGE GOES LIVE ─────────────────────────────────────
 * wa-01 is a GENUINE screenshot: a real participant, a real conversation, the
 * original WhatsApp export filename, rupee icon in the compose bar. It leads
 * the strip for that reason.
 *
 * wa-02, wa-03 and wa-04 arrived as files named "ChatGPT Image <timestamp>",
 * show Western first names and stock portraits on a funnel selling to India,
 * and read as generated rather than captured. They are treated here as
 * PLACEHOLDERS for the real screenshots the brief says TGO will supply.
 *
 * Publishing them as real customer messages would be a fabricated testimonial:
 * against ASCI's code and the CCPA's 2022 endorsement guidelines under the
 * Consumer Protection Act 2019, and against Meta's advertising policies, which
 * matters more than usual here because every visitor arrives from an ad.
 *
 * Swap them for real screenshots, or cut the array down to what is real. The
 * layout works with one card.
 *
 * ── ADDING ONE ──────────────────────────────────────────────────────────────
 * Drop the file in public/whatsapp-screenshots as wa-NN.jpg and add a line.
 * JPEG, not PNG, and no wider than about 900px: the four that arrived were
 * 1.5MB PNGs, which Next's optimiser took 5.3 SECONDS each to process and
 * still served at 764KB, so the strip was empty for as long as anyone was
 * looking at it. Re-encoded to 900px JPEG they are ~180KB and instant.
 */
const SHOTS: Shot[] = [
  { src: '/whatsapp-screenshots/wa-01.jpg', w: 610, h: 1356, alt: 'WhatsApp message from a participant about back pain easing after the classes' },
  { src: '/whatsapp-screenshots/wa-02.jpg', w: 900, h: 1599, alt: 'WhatsApp message from a participant about the live corrections' },
  { src: '/whatsapp-screenshots/wa-03.jpg', w: 900, h: 1599, alt: 'WhatsApp message from a participant about the sessions' },
  { src: '/whatsapp-screenshots/wa-04.jpg', w: 900, h: 1599, alt: 'WhatsApp message from a participant about neck and upper back stiffness' },
];

/** One frame for every card, so a strip of mixed screenshot sizes lines up. */
const SHOT_ASPECT = 'aspect-[9/16]';

/**
 * Card width plus gap — the distance the phone rail travels per card.
 *
 * 264 + 16, against the video rails' 240 + 16. The two are fed to the same
 * railDuration() so both come out at the same PIXELS PER SECOND despite the
 * different card widths; matching the durations instead would have run this
 * rail 9% faster than the ones above it.
 */
const SHOT_CARD_PITCH = 264 + 16;

/* ══ lightbox ════════════════════════════════════════════════════════════ */

function ShotModal({ shot, onClose }: { shot: Shot; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    /* Same contract as the video modal: remember where focus was, take it,
       hand it back on close, and stop the page behind from scrolling. */
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

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
      aria-label={shot.alt}
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,16,45,0.92)' }}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close screenshot"
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full"
        style={{ background: 'rgba(255,255,255,0.14)', color: '#FFFFFF' }}
      >
        <X weight="bold" className="h-5 w-5" />
      </button>

      {/* A tap on the image itself must not close the sheet; a tap on the
          backdrop still does. */}
      <div onClick={(e) => e.stopPropagation()} className="relative max-h-[86vh] w-full max-w-[420px]">
        {/* object-contain and a viewport-relative cap, because the point of
            opening this is to read ALL of it — a cover crop here would hide
            the messages the reader tapped in to see. */}
        <Image
          src={shot.src}
          alt={shot.alt}
          width={shot.w}
          height={shot.h}
          sizes="(max-width: 480px) 92vw, 420px"
          className="max-h-[86vh] w-auto rounded-2xl object-contain"
          style={{ margin: '0 auto' }}
        />
      </div>
    </div>
  );
}

/* ══ card ════════════════════════════════════════════════════════════════ */

function ShotCard({
  shot,
  onOpen,
  duplicate = false,
}: {
  shot: Shot;
  onOpen: (s: Shot) => void;
  duplicate?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(shot)}
      aria-label={`Open screenshot: ${shot.alt}`}
      /* The rail's second copy exists only to hide the loop seam. A screen
         reader announcing eight screenshots when there are four is wrong, so
         the copy is hidden from assistive tech and taken out of the tab order,
         while staying tappable for anyone who taps what they can see. */
      aria-hidden={duplicate || undefined}
      tabIndex={duplicate ? -1 : undefined}
      className={[
        'sm-testi-card group relative w-[264px] shrink-0 snap-center overflow-hidden rounded-2xl border sm:w-[280px]',
        SHOT_ASPECT,
        duplicate ? 'sm-testi-dup' : '',
      ].join(' ')}
      style={{ borderColor: C.line, background: C.lightBlue }}
    >
      {/* object-top, not centre. These are chats: the header and the first
          messages are the part that says who is speaking and about what, and
          a centre crop throws exactly that away. */}
      <Image
        src={shot.src}
        alt=""
        fill
        sizes="(max-width: 639px) 264px, 280px"
        /* EAGER, unlike the video rail's posters. Lazy loading works when a
           card sits still until the reader scrolls to it; on a rail that
           travels on its own, a card slides into view and spends its first
           moment as an empty blue rectangle — and because the rail loops, it
           does that where the reader is already looking. There are only four
           distinct images and the duplicates share their URLs, so this is four
           requests of about 74KB, once. */
        loading="eager"
        className="object-cover object-top"
      />

      {/* A corner control rather than the video rail's centred play badge.
          Centred, it would sit on top of the messages the card exists to
          show; in the corner it reads as "there is more of this". */}
      <span
        aria-hidden
        className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full transition-transform duration-200 group-hover:scale-105"
        style={{ background: 'rgba(255,255,255,0.94)', boxShadow: '0 6px 20px -6px rgba(0,32,98,0.55)' }}
      >
        <ArrowsOutSimple weight="bold" className="h-4 w-4" style={{ color: C.blueFill }} />
      </span>
    </button>
  );
}

/* ══ sub-section ═════════════════════════════════════════════════════════ */

export default function WhatsAppWall() {
  const [open, setOpen] = useState<Shot | null>(null);
  /* True while a finger is on the rail, which pauses it. */
  const [held, setHeld] = useState(false);
  const close = useCallback(() => setOpen(null), []);

  if (SHOTS.length === 0) return null;

  return (
    <div className="mt-16 sm:mt-20">
      {/* A sub-heading, not a SectionHeading. This sits INSIDE the
          testimonials section and is more of the same argument in another
          medium, so giving it the full 44px section type would split one
          proof block into two and make the reader wonder what changed. */}
      <div className="mx-auto max-w-3xl text-center">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ background: C.greenBed, color: '#0F5A2C' }}
        >
          <WhatsappLogo weight="fill" className="h-3.5 w-3.5" />
          From the group
        </span>
        <h3
          className="mt-4 font-heading text-[22px] font-bold leading-tight tracking-[-0.01em] sm:text-[28px]"
          style={{ color: C.ink }}
        >
          What they message Atul afterwards
        </h3>
        <p
          className="mx-auto mt-3 max-w-xl text-[14.5px] leading-relaxed sm:text-[15.5px]"
          style={{ color: C.inkSoft }}
        >
          Unprompted messages from the participant group. Tap any one to read it
          in full.
        </p>
      </div>

      {/* ══ phone · auto-scrolling rail ══════════════════════════════════
          Same mechanics as the two video rails above: two copies of the list
          in one track, animated -50%, so copy two lands where copy one began
          and the seam is invisible. Third rail down the page, so it travels
          right-to-left and continues the alternation.

          It pauses while the lightbox is open and while a finger is down —
          without the second of those, tapping means aiming at a moving target
          and the card slides out from under the thumb. That pause is what
          makes a rail of TEXT usable: anyone who wants to read one holds it
          still, and anyone who wants to read it properly taps it open. */}
      <div
        className="sm-testi-viewport -mx-4 mt-8 sm:hidden"
        style={{ ['--rail-duration' as string]: railDuration(SHOTS.length, SHOT_CARD_PITCH) }}
      >
        <div
          className="sm-testi-track gap-4 px-4"
          data-paused={open !== null || held ? 'true' : 'false'}
          onTouchStart={() => setHeld(true)}
          onTouchEnd={() => setHeld(false)}
          onTouchCancel={() => setHeld(false)}
        >
          {SHOTS.map((shot) => (
            <ShotCard key={shot.src} shot={shot} onOpen={setOpen} />
          ))}
          {SHOTS.map((shot) => (
            <ShotCard key={`dup-${shot.src}`} shot={shot} onOpen={setOpen} duplicate />
          ))}
        </div>
      </div>

      {/* ══ sm and up · a manual strip ════════════════════════════════════
          NOT a rail. There is no thumb to hold a desktop rail still with, so
          a moving strip of text would simply be unreadable, and at 1280 all
          four fit at once with nothing to scroll anyway.

          justify-safe-center rather than justify-center: plain centring on a
          container that overflows centres the overflow too, and a scroll
          container cannot scroll past zero, so the first card was unreachable
          at every width between 640 and 1180. `safe` centres only while it
          fits. */}
      <div
        className="scroll-x-clean justify-safe-center mt-8 hidden snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:flex"
        style={{ WebkitOverflowScrolling: 'touch', scrollPaddingInline: '1rem' }}
      >
        {SHOTS.map((shot) => (
          <ShotCard key={shot.src} shot={shot} onOpen={setOpen} />
        ))}
      </div>

      {open && <ShotModal shot={open} onClose={close} />}
    </div>
  );
}

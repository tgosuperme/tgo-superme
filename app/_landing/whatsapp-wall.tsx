'use client';

/**
 * The WhatsApp wall — messages from the group, under the video testimonials.
 *
 * Part A, A3: "a horizontal scroll of screenshots from the September group",
 * titled "From the September group".
 *
 * ── WHY THIS ONE DOES NOT AUTO-SCROLL ───────────────────────────────────────
 * The video rails above travel on their own. This does not, and that is the
 * whole design decision rather than an omission.
 *
 * A testimonial video is recognisable at a glance — a face, a room, a person
 * talking — so a card can drift past and still do its job; the reader taps the
 * one they like the look of. A chat screenshot is TEXT. Reading it takes ten
 * or fifteen seconds of holding still, and a strip that moves underneath makes
 * that impossible: the reader is chasing the sentence they started. Every
 * WhatsApp wall that auto-scrolls is unreadable, so this one is a manual,
 * snapping, swipeable strip.
 *
 * It also stops the page having three things moving at once in the same
 * section, which on a phone is where motion tips from lively into restless.
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

import { C } from './shared';

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

function ShotCard({ shot, onOpen }: { shot: Shot; onOpen: (s: Shot) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(shot)}
      aria-label={`Open screenshot: ${shot.alt}`}
      className={`group relative w-[264px] shrink-0 snap-center overflow-hidden rounded-2xl border sm:w-[280px] ${SHOT_ASPECT}`}
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

      {/* Full-bleed on a phone so a card sits at the screen edge and the strip
          reads as continuing past it; contained from sm up, where a centred
          row of cards inside the measure looks deliberate instead.

          snap-x with snap-center parks a card in the middle rather than
          wherever the finger stopped, which on a strip of things you have to
          read is the difference between browsing and fighting it. */}
      <div
        className="scroll-x-clean justify-safe-center -mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
        /* Momentum scrolling on iOS, and a scroll padding so a snapped card
           clears the full-bleed edge padding rather than butting against it. */
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

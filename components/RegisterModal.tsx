'use client';

import { CheckCircle, Crown, X } from '@phosphor-icons/react/dist/ssr';
import { useCallback, useEffect, useRef, useState } from 'react';

import RegisterForm from './RegisterForm';
import { C } from '@/app/_landing/shared';
import { OFFER_CONFIG } from '@/lib/offer-config';

/**
 * The registration form as a dialog over the landing page.
 *
 * ── THE ONLY WAY TO REGISTER ────────────────────────────────────────────────
 * There is no /register page any more. Every CTA on the landing page points at
 * the `#register` fragment, and this component turns a click on any of them
 * into the dialog.
 *
 * THAT MEANS NO NO-JS FALLBACK. When this was a modal over a real page, a
 * reader without JavaScript still got a working form; now they get a link that
 * does nothing. That is a deliberate trade, made when the page was removed —
 * see the note in lib/offer-config.ts. If it needs undoing, the fix is to
 * restore a /register route rendering <RegisterForm />, not to make this
 * cleverer.
 *
 * CtaTracker's delegated listener runs on the CAPTURE phase and still sees
 * every one of these clicks, so atc_event fires as it always did.
 *
 * ── WHY THIS LISTENS ON THE CAPTURE PHASE ───────────────────────────────────
 * Most CTAs on this page are next/link, not bare anchors. next/link attaches
 * its own React onClick that calls preventDefault() and routes client-side,
 * and it does NOT check defaultPrevented first — so a bubble-phase listener
 * here is too late: the router handles the click and the modal never opens.
 * That is exactly what happened the first time this was wired up, when the
 * CTAs still pointed at a real URL.
 *
 * React 18 attaches its handlers at the app root, which is a DESCENDANT of
 * document, so a document-level capture listener runs before React dispatches
 * anything. stopPropagation() there stops the click ever reaching next/link's
 * handler, which is what keeps the reader on the page.
 *
 * CtaTracker still fires, and that is not luck: it also listens on document
 * capture, and stopPropagation does not affect other listeners on the SAME
 * node — only stopImmediatePropagation would, which is deliberately not used
 * here. So atc_event goes out whichever order the two components mount in.
 *
 * ── THE FOCUS AND SCROLL RULES ──────────────────────────────────────────────
 * A dialog that does not trap focus is a dialog a keyboard user falls out of
 * the back of, and one that does not lock scroll is one that scrolls the page
 * behind it on a phone. Both are handled below, along with Escape and an
 * overlay click, because those are the three ways people expect to get out.
 */

const OPEN_SELECTOR = `a[href="${OFFER_CONFIG.registerAnchor}"]`;

/**
 * Which option the reader is registering toward.
 *
 * `undefined` on the landing page: nothing has been chosen yet, and the OTO
 * asks that question later. Set on the OTO, where they pressed one of the two
 * buttons BEFORE registering — the choice is already made, so the dialog shows
 * it back to them and the submit carries it out rather than dropping them on
 * /upgrade to choose again.
 */
export type RegisterIntent = 'free' | 'vip';

export default function RegisterModal({
  /**
   * CONTROLLED MODE. When `open` is passed, the parent owns the state and the
   * link interception below is switched off — that is the OTO, which opens
   * this itself from its own buttons. Left undefined on the landing page,
   * where the dialog is opened by CTA clicks and owns its own state.
   */
  open: openProp,
  onClose,
  intent,
  onRegistered,
}: {
  open?: boolean;
  onClose?: () => void;
  intent?: RegisterIntent;
  onRegistered?: () => void | Promise<void>;
} = {}) {
  const controlled = openProp !== undefined;
  const [selfOpen, setSelfOpen] = useState(false);
  const open = controlled ? openProp : selfOpen;
  const setOpen = setSelfOpen;
  const panelRef = useRef<HTMLDivElement>(null);
  /* Whatever was focused when the dialog opened, so focus can be handed back
     to it on close rather than dumped at the top of the document. */
  const opener = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    if (onClose) onClose();
    else setOpen(false);
    opener.current?.focus?.();
    opener.current = null;
  }, [onClose]);

  /* ── intercept every CTA on the page ──────────────────────────────────
     Uncontrolled mode only. On the OTO the parent opens this from its own
     buttons, and there are no #register links on that page to listen for. */
  useEffect(() => {
    if (controlled) return undefined;

    function onClick(e: MouseEvent) {
      /* Let the browser handle the clicks a link is SUPPOSED to handle its own
         way: new tab, new window, download, and any modified click. Hijacking
         a ctrl-click into a modal is the kind of thing that makes a page feel
         broken to the people most likely to notice. */
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const link = (e.target as HTMLElement | null)?.closest?.('a');
      if (!link) return;
      if (link.target && link.target !== '_self') return;
      /* getAttribute, not link.href: the latter is resolved to an absolute URL
         and would need parsing to compare. */
      const href = link.getAttribute('href') ?? '';
      if (href !== OFFER_CONFIG.registerAnchor) return;

      e.preventDefault();
      /* Stops the click reaching next/link's own handler further down the
         tree, which would otherwise route to the fragment and scroll the page
         out from under the dialog. NOT stopImmediatePropagation — CtaTracker
         shares this node and must still fire. */
      e.stopPropagation();
      opener.current = link as HTMLElement;
      setOpen(true);
    }

    document.addEventListener('click', onClick, { capture: true });
    return () =>
      document.removeEventListener('click', onClick, { capture: true });
  }, [controlled]);

  /* ── escape, scroll lock, and a focus trap ────────────────────────── */
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key !== 'Tab') return;

      /* The trap. Without it, tabbing past the last field walks into the
         landing page behind the overlay, which is invisible to a sighted
         keyboard user and completely lost to a screen reader. */
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);

    /* Scroll lock. The padding compensates for the scrollbar the lock removes,
       so the page behind does not visibly jump sideways as the dialog opens —
       on desktop that shift is small and extremely noticeable. */
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    /* Focus the panel itself rather than the first input: on a phone, focusing
       a text field immediately throws the keyboard up over the dialog before
       the reader has seen what it is asking. */
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="sm-modal-backdrop fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain p-4 sm:items-center sm:p-6"
      /* Near-black navy rather than the brand blue this used to use. A heavily
         saturated blue scrim tints the whole page and makes the white panel
         read as blue-grey; a desaturated dark just recedes, which is the only
         job a scrim has. */
      style={{
        background: 'rgba(8,17,38,0.62)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      /* The overlay closes, but only when the overlay ITSELF is the target —
         a click that started inside the panel and drifted out (selecting text
         across the edge, say) must not dismiss a half-filled form. */
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-modal-title"
        tabIndex={-1}
        /* 460, down from 560. Five short fields in a 560px box left the name
           row stretched wide and the whole thing looking like a page that had
           lost its page. A form this size wants a column, not a canvas. */
        className="sm-modal-panel relative my-auto w-full max-w-[460px] overflow-hidden rounded-[26px] outline-none"
        style={{
          background: C.white,
          boxShadow:
            '0 32px 70px -24px rgba(8,17,38,0.55), 0 0 0 1px rgba(255,255,255,0.06)',
          /* INLINE, because it has to beat the global `:focus-visible` rule in
             globals.css. The panel is focused programmatically on open — for
             screen readers, and so Escape works before anything is tabbed to —
             but it is a container, not a control, and a 2px ring drawn around
             the whole dialog reads as a rendering fault rather than focus.
             The controls inside it keep their rings. */
          outline: 'none',
        }}
      >
        {/* ── header ───────────────────────────────────────────────────
            A tinted band, separated by a hairline. The title used to sit on
            the same flat white as the fields with nothing between them, so
            the dialog had no top — it just started. A distinct header is what
            makes the rest read as content inside something. */}
        <div
          className="flex items-start justify-between gap-4 px-6 py-5 sm:px-7"
          style={{ background: C.paleBlue, borderBottom: `1px solid ${C.line}` }}
        >
          <div className="min-w-0">
            <h2
              id="register-modal-title"
              className="font-heading text-[20px] font-bold leading-tight sm:text-[22px]"
              style={{ color: C.ink }}
            >
              Claim your free place
            </h2>
            {/* The context line the form used to carry as a second heading.
                Here it is what it always was — a subtitle. */}
            {/* Kept short deliberately: at 390px the longer version wrapped to
                three lines and left "us." stranded on the last one. */}
            <p className="mt-1.5 text-[13.5px] leading-snug" style={{ color: C.inkSoft }}>
              Four quick details and your place is held.
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors hover:brightness-95 focus:outline-none focus:ring-[3px] focus:ring-[rgba(16,84,194,0.25)]"
            style={{ background: C.white, color: C.inkSoft, border: `1px solid ${C.line}` }}
          >
            <X weight="bold" className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ── what they are opting for ─────────────────────────────────
            Only when an intent exists, which means they arrived here by
            pressing one of the OTO's two buttons before they had registered.
            Showing it back to them matters: they made a choice, got a form
            instead, and without this there is nothing on screen confirming
            the choice survived. The VIP row states the price again, because
            the next thing after submitting is a payment page. */}
        {intent && (
          <div
            className="flex items-center justify-between gap-3 px-6 py-3.5 sm:px-7"
            style={{
              background: intent === 'vip' ? 'rgba(16,84,194,0.06)' : C.white,
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <span className="flex items-center gap-2.5">
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
                style={{
                  background: intent === 'vip' ? C.blueFill : C.greenBed,
                }}
              >
                {intent === 'vip' ? (
                  <Crown weight="fill" className="h-3.5 w-3.5 text-white" />
                ) : (
                  <CheckCircle
                    weight="fill"
                    className="h-3.5 w-3.5"
                    style={{ color: C.greenInk }}
                  />
                )}
              </span>
              <span className="leading-tight">
                <span
                  className="block text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: C.inkMuted }}
                >
                  You are choosing
                </span>
                <span
                  className="mt-0.5 block text-[13.5px] font-semibold"
                  style={{ color: C.ink }}
                >
                  {intent === 'vip' ? 'Free Seat + VIP Access' : 'Free Seat'}
                </span>
              </span>
            </span>
            <span
              className="shrink-0 font-heading text-[15px] font-bold"
              style={{ color: C.goldDeep }}
            >
              {intent === 'vip' ? OFFER_CONFIG.vip.priceLabel : OFFER_CONFIG.priceLabel}
            </span>
          </div>
        )}

        <div className="px-6 py-6 sm:px-7">
          <RegisterForm
            onRegistered={onRegistered}
            paid={intent === 'vip'}
            submitLabel={
              intent === 'vip'
                ? `Continue to payment · ${OFFER_CONFIG.vip.priceLabel}`
                : 'Claim My Free Place'
            }
          />
        </div>
      </div>
    </div>
  );
}

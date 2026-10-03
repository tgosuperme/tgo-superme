'use client';

/**
 * The registration form, in a modal, opened by every CTA on the landing page.
 *
 * ── WHY A MODAL AND NOT A PAGE ────────────────────────────────────────────
 * The seat is free. The only thing standing between a reader and it is five
 * fields, and sending them to a separate page to type those five fields costs a
 * navigation, a fresh paint, and the context of whatever section finally
 * persuaded them. A modal keeps the page behind them, which is the page that
 * did the work.
 *
 * ── WHAT IT DOES ON SUBMIT ────────────────────────────────────────────────
 * POSTs to /api/register, which writes the free Pabbly row and reports
 * `registration_complete` to Meta with the full match set. The reply carries a
 * signed token; that plus the typed fields go into sessionStorage so the OTO
 * can greet them by name and the Stripe session can prefill itself. Then it
 * forwards to the OTO.
 *
 * ── MODAL MECHANICS THAT ARE NOT OPTIONAL ─────────────────────────────────
 * Escape closes, the backdrop closes, focus moves into the dialog on open and
 * returns to whatever opened it on close, Tab is trapped inside while it is
 * open, and the page behind stops scrolling. A dialog missing any of those is
 * one a keyboard or screen-reader user can fall out of the back of.
 *
 * The scroll lock also pins the body position, because iOS Safari ignores
 * `overflow: hidden` on the body and happily scrolls the page under a fixed
 * overlay — the single most common way a mobile modal feels broken.
 */
import { ArrowRight, CheckCircle, Lock, WarningCircle, X } from '@phosphor-icons/react/dist/ssr';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Field,
  PhoneField,
  cityError,
  emailError,
  nameError,
  phoneError,
} from '@/app/_forms/fields';
import { DEFAULT_ISO, toE164 } from '@/app/checkout/countries';
import { C, DATE_RANGE, SESSION_TIMES_TZ, START_DATE } from '@/app/_landing/shared';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { saveRegistration } from '@/lib/registration-client';
import { restoreParams } from '@/lib/track';

import { getFbc, readCookie } from './MetaPixel';

type Fields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
};
type FieldKey = keyof Fields;

const EMPTY: Fields = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  city: '',
};

export default function RegisterModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState<Fields>(EMPTY);
  /* UK by default: the sessions are quoted in UK time, so it is the
     overwhelmingly likely answer. Fully changeable. */
  const [iso, setIso] = useState(DEFAULT_ISO);
  const [blurred, setBlurred] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLDivElement>(null);
  /* Whatever had focus when this opened, so it can be given back on close. */
  const openerRef = useRef<Element | null>(null);

  const set = (k: FieldKey) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));
  const blur = (k: FieldKey) => () => setBlurred((b) => ({ ...b, [k]: true }));

  const errors: Record<FieldKey, string | null> = {
    firstName: nameError(f.firstName, 'first name'),
    lastName: nameError(f.lastName, 'last name'),
    email: emailError(f.email),
    phone: phoneError(f.phone, iso),
    city: cityError(f.city),
  };
  const valid = Object.values(errors).every((e) => e === null);
  /* An error is only SHOWN once the reader has left the field or tried to
     submit; it always EXISTS from the first render, so `valid` is honest. */
  const shown = (k: FieldKey) => ((blurred[k] || submitted) && errors[k]) || undefined;

  const close = useCallback(() => {
    if (busy) return;
    onClose();
  }, [busy, onClose]);

  /* ── open/close side effects ────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement;

    /* iOS Safari ignores overflow:hidden on the body, so the page is pinned by
       position instead and the scroll offset restored on close. Without this
       the page behind scrolls under the overlay on exactly the devices most of
       this traffic arrives on. */
    const y = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = 'fixed';
    body.style.top = `-${y}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      /* Focus trap. Without it, Tab walks out of the dialog and into the page
         behind, which is still there and still focusable. */
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

    /* Focus the first input rather than the panel: on a form this short, the
       reader can start typing immediately. */
    const t = window.setTimeout(() => {
      firstFieldRef.current?.querySelector('input')?.focus();
    }, 60);

    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, y);
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, close]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFailed('');
    if (!valid || busy) return;
    setBusy(true);

    /* Read HERE because this is the moment they exist and the moment they are
       worth the most: the browser's own cookies, plus the click id the capture
       layer stored. Everything else Meta can match on is in the form. */
    const fbp = readCookie('_fbp');
    const fbc = getFbc();
    const attr = restoreParams();

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: f.firstName.trim(),
          lastName: f.lastName.trim(),
          email: f.email.trim(),
          /* E.164, so the sheet and any WhatsApp automation get one
             unambiguous format regardless of how it was typed. */
          phone: toE164(iso, f.phone),
          phoneCountry: iso,
          city: f.city.trim(),
          fbp,
          fbc,
          eventSourceUrl: window.location.href,
          utm: {
            source: attr.source ?? '',
            medium: attr.medium ?? '',
            campaign: attr.campaign ?? '',
            content: attr.content ?? '',
            term: attr.term ?? '',
          },
          fbclid: attr.fbclid ?? '',
          fbclidTs: attr.ts ?? 0,
          gclid: attr.gclid ?? '',
          referrer: attr.referrer ?? '',
          landingUrl: attr.landing_url ?? '',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFailed(json.error || 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }

      saveRegistration({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        email: f.email.trim(),
        phone: toE164(iso, f.phone),
        phoneCountry: iso,
        city: f.city.trim(),
        token: typeof json.token === 'string' ? json.token : '',
      });

      /* Busy stays true through the navigation: releasing it would flash an
         enabled button for the frame before the new page paints. */
      router.push(CHECKOUT_CONFIG.otoPath);
    } catch {
      setFailed('Could not reach us just now. Please try again.');
      setBusy(false);
    }
  };

  if (!open) return null;

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(0,12,38,0.72)', backdropFilter: 'blur(3px)' }}
      onClick={close}
    >
      {/* A SHEET ON A PHONE, A DIALOG ON A DESKTOP. Below sm it rises from the
          bottom edge and squares off its lower corners, which is where a thumb
          already is and what every native sheet on the device does. Above sm it
          is centred. Same markup, two idioms. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
        onClick={(e) => e.stopPropagation()}
        className="sm-sheet relative flex max-h-[94dvh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-3xl sm:max-h-[90dvh] sm:rounded-3xl"
        style={{ background: C.white, boxShadow: '0 40px 80px -30px rgba(0,12,38,0.6)' }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full transition-colors"
          style={{ background: C.paleBlue, color: C.inkSoft }}
        >
          <X weight="bold" className="h-4 w-4" />
        </button>

        {/* ── header ─────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 pb-4 pt-7 text-center sm:px-8">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ background: C.greenBed, color: C.greenInk }}
          >
            <CheckCircle weight="fill" className="h-3 w-3" />
            Free seat
          </span>
          <h2
            id="register-title"
            className="mt-3 font-heading text-[23px] font-bold leading-tight sm:text-[26px]"
            style={{ color: C.ink }}
          >
            Claim your free seat
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: C.inkMuted }}>
            {DATE_RANGE} · {SESSION_TIMES_TZ} · Live on Zoom
          </p>
        </div>

        {/* ── the form, the only scrolling part ──────────────────── */}
        <form
          id="register-form"
          onSubmit={submit}
          noValidate
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-2 sm:px-8"
        >
          <div className="grid gap-4">
            <div
              ref={firstFieldRef}
              className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2"
            >
              <Field
                id="reg-firstName"
                label="First name"
                placeholder="Priya"
                value={f.firstName}
                onChange={set('firstName')}
                onBlur={blur('firstName')}
                error={shown('firstName')}
                autoComplete="given-name"
              />
              <Field
                id="reg-lastName"
                label="Last name"
                placeholder="Sharma"
                value={f.lastName}
                onChange={set('lastName')}
                onBlur={blur('lastName')}
                error={shown('lastName')}
                autoComplete="family-name"
              />
            </div>

            <Field
              id="reg-email"
              label="Email address"
              placeholder="you@email.com"
              type="email"
              inputMode="email"
              value={f.email}
              onChange={set('email')}
              onBlur={blur('email')}
              error={shown('email')}
              autoComplete="email"
            />

            <PhoneField
              iso={iso}
              onIsoChange={setIso}
              value={f.phone}
              onChange={set('phone')}
              onBlur={blur('phone')}
              error={shown('phone')}
            />

            <Field
              id="reg-city"
              label="City / town"
              placeholder="Manchester"
              value={f.city}
              onChange={set('city')}
              onBlur={blur('city')}
              error={shown('city')}
              autoComplete="address-level2"
            />

            {submitted && !valid && (
              <p
                className="flex items-start gap-2 rounded-2xl p-3 text-[13px] leading-snug"
                style={{ background: C.coralBed, color: C.coralInk }}
                role="alert"
              >
                <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
                {errorCount === 1
                  ? 'One field still needs your attention.'
                  : `${errorCount} fields still need your attention.`}
              </p>
            )}
            {failed && (
              <p
                className="flex items-start gap-2 rounded-2xl p-3 text-[13px] leading-snug"
                style={{ background: C.coralBed, color: C.coralInk }}
                role="alert"
              >
                <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
                {failed}
              </p>
            )}
          </div>
        </form>

        {/* ── the action, pinned below the scroll area ───────────────
            Outside the scrolling form so it is on screen the whole time: on a
            short phone in landscape the fields scroll and the button does not
            move, which is the difference between a form that feels finishable
            and one that feels endless. */}
        <div
          className="shrink-0 px-6 pb-6 pt-3 sm:px-8"
          style={{
            borderTop: `1px solid ${C.line}`,
            paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="submit"
            form="register-form"
            disabled={busy}
            className="lego-press lego-pulse-glow group inline-flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-full text-[15.5px] font-semibold text-white disabled:cursor-progress disabled:opacity-70"
            style={{ background: C.blueFill }}
          >
            {busy ? 'Saving your seat…' : 'Claim My Free Seat'}
            {!busy && (
              <ArrowRight
                weight="bold"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            )}
          </button>

          <p
            className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11.5px]"
            style={{ color: C.inkMuted }}
          >
            <Lock weight="fill" className="h-3 w-3 shrink-0" />
            No card needed. Starts {START_DATE}.
          </p>
        </div>
      </div>
    </div>
  );
}

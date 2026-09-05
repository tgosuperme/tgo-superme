'use client';

/* eslint-disable jsx-a11y/label-has-associated-control -- every label uses
   htmlFor against an id on its input; airbnb additionally asserts nesting. */
import {
  ArrowRight,
  CaretDown,
  CheckCircle,
  Lock,
  WarningCircle,
} from '@phosphor-icons/react/dist/ssr';
import { useEffect, useRef, useState } from 'react';

import { getFbc, newEventId, readCookie } from '@/components/MetaPixel';
import { GA_EVENTS, gaEvent } from '@/lib/ga';
import { OFFER_CONFIG } from '@/lib/offer-config';
import { restoreParams } from '@/lib/track';

import {
  COUNTRIES,
  DEFAULT_ISO,
  findCountry,
  flagFor,
  nationalDigits,
  toE164,
} from './countries';

import { C, CTA_NOTE } from '@/app/_landing/shared';

/**
 * Registration for the free 5-Day Pain Reset.
 *
 * MODAL ONLY. This used to serve a standalone /register page as well, behind a
 * `variant` prop; that route is gone and the dialog on the landing page is now
 * the single way in, so the page shell went with it — the brand header, the
 * masthead, the summary column and the docked mobile bar. What is left is the
 * form and nothing else, which is all a dialog should ever have contained.
 *
 * It asks the SAME FIVE QUESTIONS the old paid checkout asked, in the same
 * order, because the CRM row and the Meta match keys downstream are built on
 * exactly those five.
 *
 * ── ONE SCREEN, NOT STEPS ───────────────────────────────────────────────────
 * This was a three-step wizard. It is now a single form: name, email, mobile,
 * city, all visible at once.
 *
 * The stepwise version was solving for a form that felt long. In a dialog it
 * is not long — five short fields fit one phone screen — and steps cost more
 * than they saved there: three taps instead of one, a browser's autofill
 * unable to complete a form it can only see a third of, and no way to check
 * your own email against your phone number before committing.
 *
 * The one thing genuinely lost is the mid-funnel signal that used to come from
 * finishing step 1. `ic_event` now fires on the first correctly-completed
 * field instead, which means the same thing.
 *
 * ── WHAT IS DELIBERATELY ABSENT ─────────────────────────────────────────────
 * No price, no order total, no payment logos, no card fields, no security
 * reassurance about card details. Registering is free, so every one of those
 * would be answering a question nobody is asking — and a security padlock on a
 * form that takes no payment reads as boilerplate rather than reassurance.
 *
 * The VIP upgrade exists but is NOT mentioned here, on purpose. It is offered
 * once, on /upgrade, after the seat is already held. Trailing it on the
 * registration form would turn a free sign-up into a page about money, which
 * is the one thing this form is not.
 *
 * Submitting POSTs to /api/register, which records the registration, fires
 * `registration_complete` to Meta and writes the CRM row. The browser is then
 * sent to /upgrade, which offers VIP and routes on to /thank-you or
 * /thank-you-vip.
 */

type Fields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
};
type FieldKey = keyof Fields;

/* ── validation ───────────────────────────────────────────────────────────
   Each validator returns the message to show, or null when the value is fine.
   Messages say what to DO, not that something is "invalid".

   Names are checked permissively on purpose: a rule that assumes Latin
   letters, or one word, or no apostrophes, locks out real people. The only
   things rejected are emptiness, a single character, and digits — which in a
   name field is always a mis-typed row rather than a name. */

function nameError(value: string, label: string): string | null {
  const v = value.trim();
  if (!v) return `Please enter your ${label}.`;
  if (v.length < 2) return `That looks too short — please enter your full ${label}.`;
  if (/\d/.test(v)) return `A ${label} should not contain numbers.`;
  return null;
}

/* Deliberately not RFC 5322. That grammar accepts things no mail server will,
   and the only useful question here is whether a reply can reach them. This
   rejects the four mistakes that actually happen: no @, nothing before or
   after it, no dot in the domain, and a one-character TLD. */
function emailError(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Please enter your email address.';
  if (!/^[^\s@]+@[^\s@]+$/.test(v)) return 'Please include an @ in your email address.';
  const domain = v.split('@')[1] ?? '';
  if (!domain.includes('.')) return 'That email address is missing its domain, like .com.';
  if (!/\.[A-Za-z]{2,}$/.test(v)) return 'Please check the end of your email address.';
  if (/\.\./.test(v)) return 'That email address has two dots in a row.';
  return null;
}

function phoneError(value: string, iso: string): string | null {
  const digits = nationalDigits(value);
  if (!digits) return 'Please enter your mobile number.';
  const country = findCountry(iso);
  if (digits.length < country.min) return 'That number looks too short.';
  if (digits.length > country.max) return 'That number looks too long.';
  return null;
}

function cityError(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Please enter your city or town.';
  if (v.length < 2) return 'That looks too short — please enter your city or town.';
  return null;
}

/**
 * Where this form is being rendered.
 *
 *   page   /register — full shell: brand header, masthead, the summary column
 *          and the docked mobile bar. Reached by direct links, by anyone with
 *          JavaScript off, and by ads pointing at the URL.
 *   modal  the landing page's dialog — the stepwise form and nothing else.
 *          Every piece of chrome the page adds is already on the screen
 *          behind it, so repeating it inside a dialog would be chrome around
 *          chrome, and on a phone it would push the first field off-screen.
 *
 * Always rendered by RegisterModal, never directly.
 */
export default function RegisterForm({
  /**
   * What to do once the registration is recorded, INSTEAD of navigating to
   * the OTO.
   *
   * Supplied only when the form is opened FROM the OTO — the reader pressed
   * "free seat" or "add VIP" before they had registered, so the choice is
   * already made and this carries it out. Left undefined everywhere else,
   * which is the landing page, where /upgrade is the correct next screen.
   */
  onRegistered,
  /** Overridden on the OTO, where the button continues to a known choice. */
  submitLabel = 'Claim My Free Place',
  /**
   * Whether a payment follows this form.
   *
   * Drives the reassurance line under the button, and it has to. The default
   * line is "100% Free · No Card Needed", which is true of registering and
   * FALSE the moment the next screen is Stripe — a form that promises no card
   * and then asks for one is the exact thing this funnel's copy has avoided
   * everywhere else.
   */
  paid = false,
}: {
  onRegistered?: () => void | Promise<void>;
  submitLabel?: string;
  paid?: boolean;
} = {}) {
  const [f, setF] = useState<Fields>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
  });
  /* UK by default: the sessions are quoted in UK time, so it is the
     overwhelmingly likely answer. Fully changeable. */
  const [iso, setIso] = useState(DEFAULT_ISO);
  /* Per-field, set on blur, so an error appears when the reader LEAVES a field
     rather than while they are still half-way through typing it. `submitted`
     reveals every outstanding error at once when they press the button. */
  const [blurred, setBlurred] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');

  /* ic_event is fired ONCE. Guarded with a ref rather than state because
     filling a second field is not a second conversion, and a re-render must
     not be able to re-arm it. */
  const icFired = useRef(false);

  const set = (k: FieldKey) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const errors: Record<FieldKey, string | null> = {
    firstName: nameError(f.firstName, 'first name'),
    lastName: nameError(f.lastName, 'last name'),
    email: emailError(f.email),
    phone: phoneError(f.phone, iso),
    city: cityError(f.city),
  };
  /* An error is only SHOWN once the reader has left the field or pressed the
     button; it always EXISTS from the first render, so `allValid` is honest
     throughout. */
  const shown = (k: FieldKey) =>
    ((blurred[k] || submitted) && errors[k]) || undefined;

  const allValid = Object.values(errors).every((e) => e === null);
  const errorCount = Object.values(errors).filter(Boolean).length;

  /**
   * ic_event — the mid-funnel signal.
   *
   * The paid funnel fired this on the pay button; the stepwise one fired it
   * when step 1 of 3 was completed. Neither moment exists now, so it fires on
   * the first correctly-completed field — which means the same thing both of
   * those did: the reader has stopped reading and started committing.
   *
   * Sent SERVER-side through /api/track, like atc_event; the browser Pixel
   * fires nothing but PageView.
   */
  const fireInitiate = () => {
    if (icFired.current) return;
    icFired.current = true;

    const eventId = newEventId();
    gaEvent(GA_EVENTS.initiateCheckout);

    try {
      void fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: OFFER_CONFIG.capi.events.initiateCheckout,
          eventId,
          firstName: f.firstName.trim(),
          lastName: f.lastName.trim(),
          fbp: readCookie('_fbp'),
          fbc: getFbc(),
          eventSourceUrl: window.location.href,
        }),
        keepalive: true,
      });
    } catch {
      /* Tracking never blocks a registration. */
    }
  };

  /**
   * Blur handler, and the ic_event trigger.
   *
   * Deliberately not on first keystroke. A single character in a box is a
   * misclick as often as an intention, and a conversion event that fires on
   * one is a conversion event nobody can trust. Waiting for a field to be
   * left, and to be VALID, means the reader genuinely completed something.
   */
  const blur = (k: FieldKey) => () => {
    setBlurred((b) => ({ ...b, [k]: true }));
    if (!icFired.current && errors[k] === null) fireInitiate();
  };

  /**
   * One handler for the whole form.
   *
   * The docked mobile button lives OUTSIDE the <form> and is associated by id,
   * so it runs this too. One handler rather than two copies that drift.
   */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFailed('');
    if (!allValid || busy) return;

    setBusy(true);

    /* Meta's browser-only match keys, read HERE because this is the request
       that reports the conversion. Sent with the details so /api/register can
       attach them to registration_complete and to the CRM row. */
    const fbp = readCookie('_fbp');
    const fbc = getFbc();

    /* Last-touch UTM + first-touch entry point, captured on whatever page the
       reader actually arrived on. Read at the last possible moment, and
       live-URL-first so a direct landing on /register?utm_… still counts. */
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
          /* The page the conversion happened on. */
          eventSourceUrl: window.location.href,
          /* ── attribution, for the CRM row and the fbc rebuild ──────────
             fbclid + fbclidTs let the server reconstruct `fb.1.<ts>.<fbclid>`
             when the _fbc cookie is missing, which is the normal case in
             in-app browsers and on iOS. */
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
      if (!res.ok || !json.ok) {
        setFailed(
          json.error || 'We could not save your place just then. Please try again.',
        );
        setBusy(false);
        return;
      }

      /* GA4's half of the conversion, fired only after the server confirmed
         the registration — never optimistically on submit, or a failed POST
         would report a registration that does not exist. Meta's half is sent
         server-side from /api/register under the same name.

         NOTE this fires HERE, before the OTO, not on the thank-you page. The
         registration is complete at this moment; whether they go on to buy
         VIP is a separate question with its own event. */
      gaEvent(GA_EVENTS.registrationComplete);

      /* ── where next ───────────────────────────────────────────────────
         From the landing page: on to /upgrade, which offers VIP once and
         then routes to /thank-you or /thank-you-vip.

         From the OTO itself: `onRegistered` is supplied, because the reader
         already told us which option they want by pressing one of its two
         buttons. Sending them back to /upgrade to press it a second time
         would be asking a question they have answered.

         A hard navigation in the default case rather than router.push: the
         httpOnly cookie the response just set needs to be in play before
         /upgrade renders, and a soft client transition can serve from cache
         before that happens. */
      if (onRegistered) {
        await onRegistered();
        return;
      }
      window.location.href = OFFER_CONFIG.upgradePath;
    } catch {
      setFailed('Could not reach our server. Please check your connection and try again.');
      setBusy(false);
    }
  };
  /* NO HEADING HERE. RegisterModal owns the title and the one line of context
     above it. This used to render its own <h2> as well, which put two bold
     headings of near-identical size on top of each other — the single worst
     thing about the old dialog. A form inside a titled container does not get
     to title itself. */
  return (
    <form id="register-form" onSubmit={onSubmit} noValidate className="grid gap-[18px]">
    {/* Names share a row from sm up — they are one question asked in
        two boxes, and stacking them makes the form look longer than
        it is, which is the whole thing this layout is fighting. */}
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
      <Field id="firstName" label="First name" placeholder="Priya"
        value={f.firstName} onChange={set('firstName')} onBlur={blur('firstName')}
        error={shown('firstName')} autoComplete="given-name" />
      <Field id="lastName" label="Last name" placeholder="Sharma"
        value={f.lastName} onChange={set('lastName')} onBlur={blur('lastName')}
        error={shown('lastName')} autoComplete="family-name" />
    </div>

    <Field id="email" label="Email address" placeholder="you@email.com"
      type="email" value={f.email} onChange={set('email')} onBlur={blur('email')}
      error={shown('email')} autoComplete="email"
      inputMode="email" />

    <PhoneField
      iso={iso}
      onIsoChange={setIso}
      value={f.phone}
      onChange={set('phone')}
      onBlur={blur('phone')}
      error={shown('phone')}
    />

    <Field id="city" label="City / town" placeholder="Manchester"
      value={f.city} onChange={set('city')} onBlur={blur('city')}
      error={shown('city')} autoComplete="address-level2" />

    {/* The per-field messages already say what is wrong and where.
        This is the summary a reader gets if they press the button
        with the page scrolled past the fields, and it counts rather
        than repeating them. */}
    {submitted && !allValid && (
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

    <button
      type="submit"
      disabled={busy}
      data-register-cta=""
      className="lego-press group mt-1 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-[15.5px] font-semibold text-white transition-[transform,box-shadow] disabled:cursor-progress disabled:opacity-70"
      style={{
        background: C.blueFill,
        boxShadow: '0 10px 24px -10px rgba(16,84,194,0.55)',
      }}
    >
      {busy ? 'Saving your place…' : submitLabel}
      {!busy && (
        <ArrowRight
          weight="bold"
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
        />
      )}
    </button>

    {/* Two sentences, split. The first is the promise and carries the tick;
        the second is the small print and is allowed to look like small print.
        Running them together as one grey line — which is what this was —
        buried the only reassurance that matters. */}
    <p
      className="flex items-center justify-center gap-1.5 text-[12.5px] font-medium"
      style={{ color: C.ink }}
    >
      {paid ? (
        <>
          <Lock weight="fill" className="h-3.5 w-3.5" style={{ color: C.inkSoft }} />
          Secure payment by Stripe · One payment, no subscription
        </>
      ) : (
        <>
          <CheckCircle
            weight="fill"
            className="h-3.5 w-3.5"
            style={{ color: C.greenInk }}
          />
          {CTA_NOTE}
        </>
      )}
    </p>
    <p
      className="-mt-2 text-center text-[11.5px] leading-snug"
      style={{ color: C.inkMuted }}
    >
      {paid
        ? 'Your free seat is held either way — the card is only for VIP.'
        : 'We only use these details to run the challenge.'}
    </p>
  </form>
  );
}

/* ── field label + message, shared by the text and phone fields ─────── */
/**
 * Sentence case, not the uppercase micro-caps this used to use.
 *
 * Five stacked rows of bold letter-spaced capitals read as five headings
 * competing with the dialog's actual title, and at 11px they are genuinely
 * harder to read than the same words set normally. A label's job is to be
 * skimmed and then ignored.
 */
function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[12.5px] font-medium"
      style={{ color: C.inkSoft }}
    >
      {children}
    </label>
  );
}

/**
 * The error line.
 *
 * role="alert" so a screen reader announces it when it appears, and it is
 * wired to the input with aria-describedby + aria-invalid rather than relying
 * on the red border alone — a border is invisible to a screen reader and to
 * anyone who cannot distinguish the colour.
 */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-snug"
      style={{ color: C.coralInk }}
    >
      <WarningCircle weight="fill" className="mt-[2px] h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

/**
 * ── THE FOCUS RING, WHICH WAS SIMPLY MISSING ────────────────────────────────
 * These inputs had `outline-none` and nothing to replace it, so a keyboard
 * user tabbing through the form had no idea where they were. That is a
 * straightforward accessibility failure, not a style preference.
 *
 * It is a Tailwind `ring` rather than a border colour on purpose: the border
 * is set through an inline style (it has to be, because the invalid state
 * computes it), and an inline style beats any `focus:border-*` class. A ring
 * is a box-shadow, which nothing here sets inline, so the two never collide.
 */
const inputClass =
  'w-full rounded-xl px-4 py-3 text-[15px] outline-none transition-[box-shadow,border-color] ' +
  'placeholder:text-[#9AABC6] ' +
  'focus:ring-[3px] focus:ring-[rgba(16,84,194,0.18)]';

/** Tinted a touch off pure white, so a field reads as an inset on the card. */
function inputStyle(invalid: boolean): React.CSSProperties {
  return {
    background: invalid ? '#FFF7F7' : '#FBFDFF',
    border: `1px solid ${invalid ? C.coral : C.lineStrong}`,
    color: C.ink,
  };
}

/* ── one text input ─────────────────────────────────────────────────── */
function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  type = 'text',
  autoComplete,
  inputMode,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  /** Undefined when there is nothing to show yet — see `shown` in the form. */
  error?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClass}
        style={inputStyle(Boolean(error))}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** One row height, and how many are visible before the list scrolls. */
const OPTION_H = 42;
const VISIBLE_OPTIONS = 6;

/**
 * Mobile number, with a dialling-code selector defaulting to the UK.
 *
 * The trigger and the input are two controls inside one bordered group, so the
 * pair reads as a single field. The border therefore lives on the wrapper and
 * both children are transparent — putting it on each control would draw a box
 * inside a box.
 *
 * The dropdown is custom rather than a native <select> because a native one
 * cannot be styled: it renders in the platform's own chrome, which on desktop
 * is a full-height white list in the OS font, entirely outside this page's
 * design. The cost of replacing it is that the keyboard and dismiss behaviour
 * a native select gives free has to be written — see the handlers below.
 *
 * The panel is a sibling of the bordered group, not a child, because that
 * group would otherwise need `overflow: hidden` for its corners and would clip
 * the list to a few pixels.
 */
function PhoneField({
  iso,
  onIsoChange,
  value,
  onChange,
  onBlur,
  error,
}: {
  iso: string;
  onIsoChange: (iso: string) => void;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  error?: string;
}) {
  const country = findCountry(iso);
  const invalid = Boolean(error);

  const [open, setOpen] = useState(false);
  /* The row the keyboard is on, which is NOT the selected row until Enter. */
  const [active, setActive] = useState(() =>
    Math.max(0, COUNTRIES.findIndex((c) => c.iso === iso)),
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* Dismiss on an outside press or Escape — the two things a native select
     does for free and whose absence reads as a broken menu. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /* Keep the highlighted row in view when arrowing past the visible window. */
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const choose = (index: number) => {
    onIsoChange(COUNTRIES[index].iso);
    setActive(index);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') choose(active);
      else setActive((i) => Math.min(COUNTRIES.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1))));
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="phone">Mobile number</FieldLabel>

      <div ref={wrapRef} className="relative">
        {/* focus-WITHIN, not focus: the border lives on this wrapper so the
            dial-code trigger and the number read as one field, which means the
            ring has to light up when either child is focused. */}
        <div
          className="flex items-stretch rounded-xl transition-[box-shadow,border-color] focus-within:ring-[3px] focus-within:ring-[rgba(16,84,194,0.18)]"
          style={inputStyle(invalid)}
        >
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            onKeyDown={onTriggerKey}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={`Country dialling code, currently ${country.name} plus ${country.dial}`}
            className="flex shrink-0 items-center gap-1.5 rounded-l-xl py-3 pl-3.5 pr-2.5 text-[15px] transition-colors"
            style={{ color: C.ink, background: open ? C.paleBlue : 'transparent' }}
          >
            <span aria-hidden className="text-[16px] leading-none">
              {flagFor(country.iso)}
            </span>
            +{country.dial}
            <CaretDown
              weight="bold"
              aria-hidden
              className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              style={{ color: C.inkMuted }}
            />
          </button>

          <span aria-hidden className="my-2 w-px shrink-0" style={{ background: C.lineStrong }} />

          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={country.iso === 'GB' ? '7700 900000' : 'Mobile number'}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={invalid ? 'phone-error' : undefined}
            className="min-w-0 flex-1 rounded-r-xl bg-transparent px-3.5 py-3 text-[15px] outline-none"
            style={{ color: C.ink }}
          />
        </div>

        {open && (
          <ul
            ref={listRef}
            role="listbox"
            aria-label="Country dialling code"
            tabIndex={-1}
            /* Capped at six rows: tall enough to scan a group at a glance,
               short enough that it never runs off a phone screen or covers
               the fields underneath it. */
            className="absolute left-0 top-full z-50 mt-2 w-[min(320px,100%)] overflow-y-auto overscroll-contain rounded-2xl py-1.5"
            style={{
              maxHeight: OPTION_H * VISIBLE_OPTIONS,
              background: C.white,
              border: `1px solid ${C.lineStrong}`,
              boxShadow: '0 24px 48px -20px rgba(0,32,98,0.35)',
            }}
          >
            {COUNTRIES.map((c, i) => {
              const selected = c.iso === iso;
              return (
                <li key={c.iso} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => choose(i)}
                    onMouseEnter={() => setActive(i)}
                    className="flex w-full items-center gap-2.5 px-3.5 text-left text-[14px] transition-colors"
                    style={{
                      height: OPTION_H,
                      background: i === active ? C.lightBlue : 'transparent',
                      color: selected ? C.blue : C.ink,
                      fontWeight: selected ? 600 : 400,
                    }}
                  >
                    <span aria-hidden className="text-[15px] leading-none">
                      {flagFor(c.iso)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="shrink-0 text-[13px]" style={{ color: C.inkMuted }}>
                      +{c.dial}
                    </span>
                    {selected && (
                      <CheckCircle
                        weight="fill"
                        aria-hidden
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: C.blue }}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <FieldError id="phone-error" message={error} />
    </div>
  );
}

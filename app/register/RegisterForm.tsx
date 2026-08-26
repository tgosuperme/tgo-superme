'use client';

/* eslint-disable jsx-a11y/label-has-associated-control -- every label uses
   htmlFor against an id on its input; airbnb additionally asserts nesting. */
import {
  ArrowLeft,
  ArrowRight,
  CalendarBlank,
  CaretDown,
  CheckCircle,
  Clock,
  ShieldCheck,
  VideoCamera,
  WarningCircle,
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import BrandMark from '@/components/BrandMark';
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

import { BONUSES } from '../_landing/bonus-data';
import { legoBrick, legoDelay } from '../_landing/lego-style';
import MobileCtaBar, { MOBILE_CTA_BAR_SPACE } from '../_landing/mobile-cta-bar';
import {
  C,
  CTA_NOTE,
  FREE_LABEL,
  SESSION_TIMES,
  START_DATE,
} from '../_landing/shared';

/**
 * Registration for the free 5-Day Pain Reset.
 *
 * Same anatomy as the checkout it replaces — brand header with a back link,
 * then a two-column body with the form on the left and a sticky summary on the
 * right, which stacks summary-first on mobile so the reader sees what they are
 * signing up for before the fields. It asks the SAME FIVE QUESTIONS the
 * checkout asked, in the same order, because the CRM row and the Meta match
 * keys downstream are built on exactly those five.
 *
 * ── WHY STEPWISE ────────────────────────────────────────────────────────────
 * A paid form has a price doing the qualifying. A free one does not, so the
 * only thing carrying someone through five fields is momentum, and five empty
 * boxes at once is where that momentum goes to die. Three short steps, each
 * with its own question at the top, turn one intimidating form into three
 * trivial ones — and the first step being nothing but a name is the cheapest
 * possible commitment to make.
 *
 *     1  first + last name
 *     2  email
 *     3  mobile + city
 *
 * ── WHAT IS DELIBERATELY ABSENT ─────────────────────────────────────────────
 * No price, no order total, no payment logos, no card fields, no security
 * reassurance about card details, and no money-back guarantee. There is
 * nothing to pay, so every one of those would be answering a question nobody
 * is asking — and a security padlock on a form that takes no payment reads as
 * boilerplate rather than reassurance.
 *
 * Submitting POSTs to /api/register, which records the registration, fires
 * `registration_complete` to Meta and writes the CRM row. The browser is then
 * sent to /thank-you, the same confirmation page the paid funnel used.
 */

type Fields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
};
type FieldKey = keyof Fields;

const INCLUDED = [
  { icon: VideoCamera, text: 'Five live, coach-led sessions on Zoom' },
  { icon: Clock, text: `Both daily timings, ${SESSION_TIMES}` },
  { icon: CheckCircle, text: 'Real-time form correction from Atul' },
  { icon: ShieldCheck, text: 'Your own Day 1 to Day 4 progress score' },
];

/**
 * The three steps.
 *
 * `fields` is what gates the Next button on that step, so the list is the
 * single source of truth for both the markup below and the validation — a step
 * cannot render a field it does not validate, or validate one it does not
 * render.
 */
const STEPS: { title: string; sub: string; fields: FieldKey[] }[] = [
  {
    title: 'First, who are we saving a place for?',
    sub: 'Just your name to start. Two boxes, then you are a third of the way there.',
    fields: ['firstName', 'lastName'],
  },
  {
    title: 'Where should your Zoom links go?',
    sub: 'Your joining note and both daily session links are sent to this address.',
    fields: ['email'],
  },
  {
    title: 'Last step — how do we reach you?',
    sub: 'Your mobile is how session reminders reach you on the day.',
    fields: ['phone', 'city'],
  },
];

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

export default function RegisterForm() {
  const [step, setStep] = useState(0);
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
     rather than while they are still half-way through typing it. `attempted`
     reveals every outstanding error on a step at once when they press Next. */
  const [blurred, setBlurred] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  /* Collapsed by default. The summary sits ABOVE the form on a phone, and
     expanded it pushed the first field most of a screen down; the header row
     still shows that the place is free, so nothing load-bearing is hidden.
     Only the mobile disclosure reads this — above lg it is always expanded. */
  const [summaryOpen, setSummaryOpen] = useState(false);

  /* ic_event is fired ONCE, when step 1 is completed. Guarded with a ref
     rather than state because going back and forward again is not a second
     conversion, and a re-render must not be able to re-arm it. */
  const icFired = useRef(false);
  /* Focus target for each step. Skipped on first mount, so landing on the page
     does not throw a phone keyboard up before the reader has read anything. */
  const stepRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

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
  /* An error is only SHOWN once the reader has left the field or pressed the
     button on that step; it always EXISTS from the first render, so the step
     gate below is honest throughout. */
  const shown = (k: FieldKey) =>
    ((blurred[k] || attempted[step]) && errors[k]) || undefined;

  const stepFields = STEPS[step].fields;
  const stepValid = stepFields.every((k) => errors[k] === null);
  const allValid = Object.values(errors).every((e) => e === null);
  const isLast = step === STEPS.length - 1;
  const stepErrorCount = stepFields.filter((k) => errors[k] !== null).length;

  /* Move focus to the top of the new step. Without this a keyboard or screen
     reader user presses Next and their focus stays on a button that has just
     been relabelled, with no indication that the questions changed. */
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    stepRef.current?.focus();
    stepRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [step]);

  /**
   * ic_event — the mid-funnel signal, fired when step 1 is done.
   *
   * The paid funnel fired this on the pay button. There is no pay button any
   * more, so it moves to the first real commitment the reader makes: they have
   * given a name and asked for the next question. Sent SERVER-side through
   * /api/track, like atc_event; the browser Pixel fires nothing but PageView.
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

  const back = () => {
    setFailed('');
    setStep((s) => Math.max(0, s - 1));
  };

  /**
   * One handler for the whole form.
   *
   * The docked mobile button lives OUTSIDE the <form> and is associated by id,
   * so it runs this too. That is the point: advance-or-submit is decided in
   * one place rather than in two copies that drift.
   */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted((a) => ({ ...a, [step]: true }));
    setFailed('');
    if (!stepValid || busy) return;

    if (!isLast) {
      if (step === 0) fireInitiate();
      setStep((s) => s + 1);
      return;
    }

    /* Belt and braces on the last step: every earlier step was gated, but a
       reader who edited an earlier field through browser autofill after
       passing it should not get a 400 from the server as their first hint. */
    if (!allValid) {
      setAttempted({ 0: true, 1: true, 2: true });
      const firstBadStep = STEPS.findIndex((s) =>
        s.fields.some((k) => errors[k] !== null),
      );
      if (firstBadStep >= 0) setStep(firstBadStep);
      return;
    }

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
         server-side from /api/register under the same name. */
      gaEvent(GA_EVENTS.registrationComplete);
      /* `registered=1` is a fallback flag, not proof of anything: the
         confirmation cookie /api/register just set is what carries the name
         and email. The flag exists so a reader whose cookie was refused still
         lands on the confirmation rather than the pending panel. */
      window.location.href = `${OFFER_CONFIG.thankYouPath}?registered=1`;
    } catch {
      setFailed('Could not reach our server. Please check your connection and try again.');
      setBusy(false);
    }
  };

  const primaryLabel = isLast ? 'Claim My Free Place' : 'Continue';

  return (
    <main className="min-h-screen bg-white">
      {/* ── header ─────────────────────────────────────────────────── */}
      <header style={{ background: C.paleBlue, borderBottom: `1px solid ${C.line}` }}>
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <BrandMark height={34} priority />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium"
            style={{ color: C.inkSoft }}
          >
            <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8 md:py-14">
        {/* Centred on phones, left-aligned from sm up. A left-set eyebrow,
            heading and standfirst read as a fragment of a wider layout when the
            column is the whole screen; centring makes the narrow view look
            composed rather than cropped. */}
        <div className="max-w-[620px] text-center sm:text-left">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em]"
            style={{ background: C.lightBlue, color: C.skyInk }}
          >
            <CalendarBlank weight="bold" className="h-3 w-3" />
            Cohort starts {START_DATE}
          </span>
          {/* Mobile-only breaks, so the offer name gets its own line and the
              standfirst reads as three balanced ones. Each <br> is preceded by
              an explicit {' '}: above sm the break is display:none, and without
              that space the words either side would run together. */}
          <h1
            className="mt-4 font-heading text-[30px] font-bold leading-[1.12] sm:text-[38px]"
            style={{ color: C.ink }}
          >
            Claim your free place on the{' '}
            <br className="sm:hidden" />
            <span style={{ color: C.goldDeep }}>5-Day Pain Reset</span>
          </h1>
          <p className="mt-3 text-[15.5px]" style={{ color: C.inkSoft }}>
            Three quick questions.{' '}
            <br className="sm:hidden" />
            {CTA_NOTE}.
          </p>
        </div>

        {/* ── two columns: form left, summary right ─────────────────── */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
          {/* summary renders first on mobile so the reader sees the offer
              before the fields */}
          <section
            data-lego=""
            className="order-2 rounded-3xl p-6 sm:p-8 lg:order-1"
            style={{ background: C.white, border: `1px solid ${C.line}` }}
          >
            {/* ── progress ───────────────────────────────────────────
                A counted label and a bar. The label is the part that
                actually reassures — "2 of 3" is a promise about how much is
                left — and the bar is the part that is felt. */}
            <div className="flex items-center justify-between gap-4">
              <p
                className="text-[10.5px] font-bold uppercase tracking-[0.18em]"
                style={{ color: C.inkMuted }}
              >
                Step {step + 1} of {STEPS.length}
              </p>
              <p className="text-[11.5px] font-semibold" style={{ color: C.skyInk }}>
                {Math.round(((step + 1) / STEPS.length) * 100)}% there
              </p>
            </div>
            <div
              className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={STEPS.length}
              aria-valuenow={step + 1}
              aria-label="Registration progress"
              style={{ background: C.lightBlue }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${((step + 1) / STEPS.length) * 100}%`,
                  background: C.blueFill,
                }}
              />
            </div>

            {/* tabIndex -1 so focus can be moved here on a step change, but it
                never lands in the tab order on the way past. */}
            <div ref={stepRef} tabIndex={-1} className="mt-7 outline-none">
              <h2 className="font-heading text-[20px] font-bold" style={{ color: C.ink }}>
                {STEPS[step].title}
              </h2>
              <p className="mt-1 text-[13.5px]" style={{ color: C.inkMuted }}>
                {STEPS[step].sub}
              </p>
            </div>

            {/* The id is load-bearing: the docked mobile bar's button submits
                this form from outside it with `form="register-form"`. */}
            <form id="register-form" onSubmit={onSubmit} noValidate className="mt-6 grid gap-4">
              {step === 0 && (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                  <Field id="firstName" label="First name" placeholder="Priya"
                    value={f.firstName} onChange={set('firstName')} onBlur={blur('firstName')}
                    error={shown('firstName')} autoComplete="given-name" />
                  <Field id="lastName" label="Last name" placeholder="Sharma"
                    value={f.lastName} onChange={set('lastName')} onBlur={blur('lastName')}
                    error={shown('lastName')} autoComplete="family-name" />
                </div>
              )}

              {step === 1 && (
                <Field id="email" label="Email address" placeholder="you@email.com"
                  type="email" value={f.email} onChange={set('email')} onBlur={blur('email')}
                  error={shown('email')} autoComplete="email"
                  inputMode="email" />
              )}

              {step === 2 && (
                <>
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
                </>
              )}

              {/* The per-field messages already say what is wrong and where.
                  This is the summary a reader gets if they press the button
                  with the page scrolled past the fields, and it counts rather
                  than repeating them. */}
              {attempted[step] && !stepValid && (
                <p
                  className="flex items-start gap-2 rounded-2xl p-3 text-[13px] leading-snug"
                  style={{ background: C.coralBed, color: C.coralInk }}
                  role="alert"
                >
                  <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
                  {stepErrorCount === 1
                    ? 'One field still needs your attention.'
                    : `${stepErrorCount} fields still need your attention.`}
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

              {/* Back sits BESIDE the primary action rather than above it, and
                  only from step 2 — on step 1 there is nowhere to go back to,
                  and rendering a disabled one would be a dead control. */}
              <div className="mt-2 flex items-center gap-3">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={back}
                    className="lego-press inline-flex min-h-[56px] shrink-0 items-center justify-center gap-1.5 rounded-full px-5 text-[14.5px] font-semibold"
                    style={{
                      background: C.white,
                      border: `1px solid ${C.lineStrong}`,
                      color: C.inkSoft,
                    }}
                  >
                    <ArrowLeft weight="bold" className="h-4 w-4" />
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  data-register-cta=""
                  className="lego-press lego-pulse-glow group inline-flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-full text-[15.5px] font-semibold text-white disabled:cursor-progress disabled:opacity-70"
                  style={{ background: C.blueFill }}
                >
                  {busy ? 'Saving your place…' : primaryLabel}
                  {!busy && (
                    <ArrowRight
                      weight="bold"
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                    />
                  )}
                </button>
              </div>

              <p
                className="flex items-center justify-center gap-1.5 text-[12px]"
                style={{ color: C.inkMuted }}
              >
                <CheckCircle weight="fill" className="h-3 w-3" style={{ color: C.greenInk }} />
                {CTA_NOTE}. We only use these details to run the challenge.
              </p>
            </form>
          </section>

          {/* ── what you are claiming ──────────────────────────────── */}
          <aside
            data-lego=""
            className="order-1 self-start rounded-3xl p-6 sm:p-7 lg:order-2 lg:sticky lg:top-6"
            style={{
              ...legoDelay(1, 110),
              background: C.paleBlue,
              border: `1px solid ${C.line}`,
            }}
          >
            {/* Mobile: a disclosure, open by default. The summary sits ABOVE
                the form on a phone (order-1), so left expanded it pushes the
                first field most of a screen down — but collapsing it entirely
                would hide what the reader is signing up for at the exact
                moment they are deciding. Open-but-collapsible is the version
                that costs nothing either way.

                Desktop is untouched: the same element is inert above lg
                (`lg:pointer-events-none`), the caret is hidden, and the body
                is forced open with `lg:!grid-rows-[1fr]`. */}
            <button
              type="button"
              onClick={() => setSummaryOpen((o) => !o)}
              aria-expanded={summaryOpen}
              aria-controls="offer-summary-body"
              className="flex w-full items-center justify-between gap-3 text-left lg:pointer-events-none lg:cursor-default"
            >
              <h2
                className="text-[10.5px] font-bold uppercase tracking-[0.18em]"
                style={{ color: C.inkMuted }}
              >
                What you are claiming
              </h2>
              <span className="flex items-center gap-2 lg:hidden">
                <span
                  className="font-heading text-[15px] font-bold"
                  style={{ color: C.goldDeep }}
                >
                  {FREE_LABEL}
                </span>
                <CaretDown
                  weight="bold"
                  aria-hidden
                  className={`h-3.5 w-3.5 transition-transform duration-300 ${
                    summaryOpen ? 'rotate-180' : ''
                  }`}
                  style={{ color: C.inkMuted }}
                />
              </span>
            </button>

            <div
              id="offer-summary-body"
              className={`grid transition-[grid-template-rows] duration-300 ease-out lg:!grid-rows-[1fr] ${
                summaryOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <div
                  className="lego-hover-sm mt-4 flex items-start gap-3 rounded-2xl p-3.5"
                  style={{ background: C.white, border: `1px solid ${C.line}` }}
                >
                  <span
                    className="lego-stud grid h-12 w-12 shrink-0 place-items-center rounded-xl"
                    style={{ background: C.blueFill }}
                  >
                    <span className="font-heading text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                      5-DAY
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block text-[14px] font-semibold leading-snug"
                      style={{ color: C.ink }}
                    >
                      5-Day Pain Reset Challenge
                    </span>
                    <span className="mt-0.5 block text-[11.5px]" style={{ color: C.inkMuted }}>
                      Live · Coach-led · Zoom
                    </span>
                  </span>
                  <span
                    className="shrink-0 font-heading text-[15px] font-bold"
                    style={{ color: C.goldDeep }}
                  >
                    {FREE_LABEL}
                  </span>
                </div>

                <p
                  className="mt-5 text-[10.5px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: C.inkMuted }}
                >
                  What that includes
                </p>
                <ul className="mt-2.5 grid gap-2">
                  {INCLUDED.map(({ icon: Icon, text }, idx) => (
                    <li
                      key={text}
                      data-lego=""
                      className="flex items-start gap-2.5"
                      style={legoBrick(idx, 60)}
                    >
                      <span
                        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
                        style={{ background: 'rgba(159,218,203,0.34)' }}
                      >
                        <Icon weight="bold" className="h-2.5 w-2.5" style={{ color: C.mintInk }} />
                      </span>
                      <span className="text-[13px] leading-snug" style={{ color: C.inkSoft }}>
                        {text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* ── the four bonuses ──────────────────────────────────
                    Listed by name only. The paid summary showed a pound value
                    against each and struck a total; with nothing to pay there
                    is no figure for a saving to be measured against, and the
                    struck-total device is exactly the value stacking this
                    funnel's compliance review ruled out. */}
                <p
                  className="mt-5 text-[10.5px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: C.inkMuted }}
                >
                  Plus {BONUSES.length} instant-access bonuses
                </p>
                <ul className="mt-2.5 grid gap-2">
                  {BONUSES.map((b, idx) => (
                    <li
                      key={b.title}
                      data-lego=""
                      className="flex items-center gap-2.5"
                      style={legoBrick(idx, 60)}
                    >
                      <span
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full"
                        style={{ background: b.bed }}
                      >
                        <CheckCircle weight="fill" className="h-3 w-3" style={{ color: b.ink }} />
                      </span>
                      <span
                        className="min-w-0 flex-1 text-[13px] leading-snug"
                        style={{ color: C.inkSoft }}
                      >
                        {b.title}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="my-5 h-px" style={{ background: C.lineStrong }} />

                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.16em]"
                    style={{ color: C.ink }}
                  >
                    Total to pay
                  </span>
                  <span
                    className="font-heading text-[36px] font-bold leading-none"
                    style={{ color: C.goldDeep }}
                  >
                    {FREE_LABEL}
                  </span>
                </div>

                <p
                  className="mt-4 flex items-start gap-2 rounded-2xl p-3 text-[12.5px] leading-snug"
                  style={{ background: 'rgba(159,218,203,0.28)', color: C.ink }}
                >
                  <ShieldCheck
                    weight="fill"
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: C.mintInk }}
                  />
                  {CTA_NOTE}.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Reserves the docked bar's height in normal flow, so the last thing on
          the page is never sat on. Mobile and tablet only, like the bar. */}
      <div
        aria-hidden
        className="lg:hidden"
        style={{ height: MOBILE_CTA_BAR_SPACE }}
      />

      {/* ── docked CTA · mobile and tablet ─────────────────────────── */}
      <MobileCtaBar
        watch="[data-register-cta]"
        label={`Step ${step + 1} of ${STEPS.length}`}
        trailing={FREE_LABEL}
        note={
          <>
            <CheckCircle weight="fill" className="h-3 w-3 shrink-0" style={{ color: C.greenInk }} />
            {CTA_NOTE}
          </>
        }
      >
        {/* Outside the <form>, so it is associated by id instead. That runs the
            same handler — including the validation reveal — rather than a
            second, drifting copy of it. */}
        <button
          type="submit"
          form="register-form"
          disabled={busy}
          className="lego-press lego-pulse-glow group inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold text-white disabled:cursor-progress disabled:opacity-70"
          style={{ background: C.blueFill }}
        >
          {busy ? (
            'Saving…'
          ) : (
            <>
              {/* The full last-step label needs room the narrowest phones do
                  not have. */}
              <span className="min-[400px]:hidden">
                {isLast ? 'Claim Place' : 'Continue'}
              </span>
              <span className="hidden min-[400px]:inline">{primaryLabel}</span>
              <ArrowRight
                weight="bold"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </>
          )}
        </button>
      </MobileCtaBar>
    </main>
  );
}

/* ── field label + message, shared by the text and phone fields ─────── */
function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em]"
      style={{ color: C.inkMuted }}
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

const inputClass =
  'w-full rounded-xl px-4 py-3 text-[15px] outline-none transition-colors';

function inputStyle(invalid: boolean): React.CSSProperties {
  return {
    background: C.white,
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
        <div
          className="flex items-stretch rounded-xl transition-colors"
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

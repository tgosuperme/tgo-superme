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
  Lock,
  ShieldCheck,
  VideoCamera,
  WarningCircle,
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import BrandMark from '@/components/BrandMark';
import { getFbc, newEventId, readCookie } from '@/components/MetaPixel';
import { GA_EVENTS, GA_VALUE, gaEvent } from '@/lib/ga';
import { restoreParams } from '@/lib/track';
import PaymentLogos from '@/components/PaymentLogos';

import {
  COUNTRIES,
  DEFAULT_ISO,
  findCountry,
  flagFor,
  nationalDigits,
  toE164,
} from './countries';

import { BONUS_TOTAL, BONUSES } from '../_landing/bonus-data';
import { legoBrick, legoDelay } from '../_landing/lego-style';
import MobileCtaBar, { MOBILE_CTA_BAR_SPACE } from '../_landing/mobile-cta-bar';
import {
  C,
  CURRENCY_SYMBOL,
  PRICE,
  PRICE_LABEL,
  SESSION_TIMES,
  START_DATE,
} from '../_landing/shared';

/**
 * Checkout for the 5-Day Pain Reset.
 *
 * Same anatomy as the postpartum checkout it is modelled on: brand header with
 * a back link, then a two-column body with the details form on the left and a
 * sticky order summary on the right, which stacks summary-first on mobile so
 * the buyer sees what they are paying for before the fields.
 *
 * Two things from that page are deliberately absent, both because the UK rules
 * this funnel was reviewed against forbid them: a coupon field and any struck
 * "was" price with a savings line. There is one price and it is stated once.
 *
 * Submitting posts the buyer's details to /api/checkout, which opens a Stripe
 * Checkout Session and returns its URL; the browser is then handed to Stripe,
 * so no card details ever touch this form. Payment confirmation is not read
 * from the redirect back: /thank-you re-checks the session with Stripe, and
 * fulfilment happens in the webhook.
 */

type Fields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
};
type FieldKey = keyof Fields;

/* Challenge + bonuses, summed rather than written down, so the struck figure
   on the order summary can never drift from the two lines it is made of.

   ROUNDED, and not for tidiness. 4.99 + 27 is 31.990000000000002 in binary
   floating point, and that is exactly what rendered on the page. This is a
   decorative "what it is worth" figure rather than anything anyone is charged
   — the charged amount is amountPence, an integer, computed separately — so
   rounding it to a whole pound is safe as well as correct to look at. */
const FULL_VALUE = Math.round(PRICE + BONUS_TOTAL);

const INCLUDED = [
  { icon: VideoCamera, text: 'Five live, coach-led sessions on Zoom' },
  { icon: Clock, text: `Both daily timings, ${SESSION_TIMES}` },
  { icon: CheckCircle, text: 'Real-time form correction from Atul' },
  { icon: ShieldCheck, text: 'Your own Day 1 to Day 4 progress score' },
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

export default function CheckoutForm({ cancelled = false }: { cancelled?: boolean }) {
  const [f, setF] = useState<Fields>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
  });
  /* UK by default: the offer is in GBP and the sessions are quoted in UK time,
     so it is the overwhelmingly likely answer. Fully changeable. */
  const [iso, setIso] = useState(DEFAULT_ISO);
  /* Per-field, set on blur, so an error appears when the reader LEAVES a field
     rather than while they are still half-way through typing it. `submitted`
     reveals every outstanding error at once when they try to pay. */
  const [blurred, setBlurred] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  /* Collapsed by default. The summary sits ABOVE the form on a phone, and
     expanded it pushed the first field most of a screen down; the header row
     still shows the price, so nothing load-bearing is hidden. Only the mobile
     disclosure reads this — above lg the summary is always expanded by CSS. */
  const [summaryOpen, setSummaryOpen] = useState(false);

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
  /* An error is only SHOWN once the reader has left the field or tried to pay;
     it always EXISTS from the first render, so `valid` is honest throughout. */
  const shown = (k: FieldKey) => ((blurred[k] || submitted) && errors[k]) || undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFailed('');
    if (!valid || busy) return;
    setBusy(true);

    /* Meta's browser-only match keys, read HERE because this is the last
       moment they exist. The buyer is about to be handed to Stripe, and the
       webhook that eventually fires the Conversions API event runs on Stripe's
       infrastructure: no cookies, no fbclid, none of this. Sent with the rest
       of the details and parked in the Checkout Session's metadata. */
    const fbp = readCookie('_fbp');
    const fbc = getFbc();

    /* The id for ic_event. The event itself is sent SERVER-side from
       /api/checkout; the browser Pixel fires nothing but PageView. Minted here
       so a double-submit collapses into one conversion at Meta's end. */
    const icEventId = newEventId();
    gaEvent(GA_EVENTS.initiateCheckout, GA_VALUE);

    /* Last-touch UTM + first-touch entry point, captured on whatever page the
       buyer actually arrived on. Read at the last possible moment, and read
       live-URL-first so a direct landing on /checkout?utm_... still counts. */
    const attr = restoreParams();

    try {
      const res = await fetch('/api/checkout', {
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
          icEventId,
          /* The page the conversion started on. Stripe's success redirect is
             a different URL, so it cannot be derived later. */
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
      if (!res.ok || !json.url) {
        setFailed(json.error || 'Payment is not available yet. Please try again shortly.');
        setBusy(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setFailed('Could not reach the payment service. Please try again.');
      setBusy(false);
    }
  };

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
            composed rather than cropped. Desktop is unchanged. */}
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
            Hold your place on the{' '}
            <br className="sm:hidden" />
            <span style={{ color: C.goldDeep }}>5-Day Pain Reset</span>
          </h1>
          <p className="mt-3 text-[15.5px]" style={{ color: C.inkSoft }}>
            Two minutes to book. Come to Day One,{' '}
            <br className="sm:hidden" />
            and if it is not for you, tell us by the end of that day{' '}
            <br className="sm:hidden" />
            and we refund the {PRICE_LABEL} in full.
          </p>
        </div>

        {/* ── two columns: form left, summary right ─────────────────── */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
          {/* summary renders first on mobile so the buyer sees the offer
              before the fields */}
          <section
            data-lego=""
            className="order-2 rounded-3xl p-6 sm:p-8 lg:order-1"
            style={{ background: C.white, border: `1px solid ${C.line}` }}
          >
            <h2 className="font-heading text-[20px] font-bold" style={{ color: C.ink }}>
              Your details
            </h2>
            <p className="mt-1 text-[13.5px]" style={{ color: C.inkMuted }}>
              We send your Zoom link and joining note to this email.
            </p>

            {/* Coming back from an abandoned Stripe session otherwise looks
                identical to a dead button. */}
            {cancelled && (
              <p
                className="mt-4 rounded-2xl p-3 text-[13px] leading-snug"
                style={{ background: C.lightBlue, color: C.ink }}
              >
                You came back before the payment finished, so nothing was
                charged and your place is not held yet. Add your details again
                and you are two minutes from done.
              </p>
            )}

            {/* The id is load-bearing: the docked mobile bar's button submits
                this form from outside it with `form="checkout-form"`. */}
            <form id="checkout-form" onSubmit={submit} noValidate className="mt-7 grid gap-4">
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
                  This is the summary a reader gets if they press Pay with the
                  page scrolled past the fields, and it counts rather than
                  repeating them. */}
              {submitted && !valid && (
                <p
                  className="flex items-start gap-2 rounded-2xl p-3 text-[13px] leading-snug"
                  style={{ background: C.coralBed, color: C.coralInk }}
                  role="alert"
                >
                  <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
                  {Object.values(errors).filter(Boolean).length === 1
                    ? 'One field still needs your attention.'
                    : `${Object.values(errors).filter(Boolean).length} fields still need your attention.`}
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
                data-checkout-cta=""
                className="lego-press lego-pulse-glow group mt-2 inline-flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-full text-[15.5px] font-semibold text-white disabled:cursor-progress disabled:opacity-70"
                style={{ background: C.blueFill }}
              >
                {busy ? 'Opening secure checkout…' : `Pay ${PRICE_LABEL} & Reserve My Place`}
                {!busy && (
                  <ArrowRight
                    weight="bold"
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                )}
              </button>

              <p
                className="flex items-center justify-center gap-1.5 text-[12px]"
                style={{ color: C.inkMuted }}
              >
                <Lock weight="fill" className="h-3 w-3" />
                Secure payment. Your card details never touch our servers.
              </p>
              <div className="pt-1">
                <PaymentLogos size="compact" />
              </div>
            </form>
          </section>

          {/* ── order summary ──────────────────────────────────────── */}
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
                first field most of a screen down — but collapsing it by
                default would hide what the buyer is paying for at the exact
                moment they are deciding. Open-but-collapsible is the version
                that costs nothing either way.

                Desktop is untouched: the same element is inert above lg
                (`lg:pointer-events-none`), the caret is hidden, and the body
                is forced open with `lg:!grid-rows-[1fr]`. */}
            <button
              type="button"
              onClick={() => setSummaryOpen((o) => !o)}
              aria-expanded={summaryOpen}
              aria-controls="order-summary-body"
              className="flex w-full items-center justify-between gap-3 text-left lg:pointer-events-none lg:cursor-default"
            >
              <h2
                className="text-[10.5px] font-bold uppercase tracking-[0.18em]"
                style={{ color: C.inkMuted }}
              >
                Order summary
              </h2>
              <span className="flex items-center gap-2 lg:hidden">
                <span
                  className="font-heading text-[15px] font-bold"
                  style={{ color: C.ink }}
                >
                  {PRICE_LABEL}
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
              id="order-summary-body"
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
                style={{ color: C.ink }}
              >
                {PRICE_LABEL}
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

            {/* ── the four bonuses, priced and struck ─────────────────── */}
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
                  {/* Not struck, matching the bonus total below. These four
                      add up to that total, which is then added to the
                      challenge price to make the one struck figure at the
                      bottom. Crossing them here would cross the same money
                      twice and read as two separate discounts. */}
                  <span
                    className="shrink-0 text-[13px] font-semibold"
                    style={{ color: C.inkSoft }}
                  >
                    {CURRENCY_SYMBOL}
                    {b.value}
                  </span>
                </li>
              ))}
            </ul>

            <div className="my-5 h-px" style={{ background: C.lineStrong }} />

            {/* The two components of the struck total below, both stated
                PLAINLY. Neither is struck here: they are what the £33 is made
                of, and striking a number twice (once as a component, once
                inside the total) reads as two different discounts. */}
            <div className="grid gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[13.5px]" style={{ color: C.inkSoft }}>
                  Challenge value
                </span>
                <span className="text-[13.5px] font-semibold" style={{ color: C.ink }}>
                  {PRICE_LABEL}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[13.5px]" style={{ color: C.inkSoft }}>
                  Total bonus value
                </span>
                <span className="text-[13.5px] font-semibold" style={{ color: C.ink }}>
                  {CURRENCY_SYMBOL}
                  {BONUS_TOTAL}
                </span>
              </div>
            </div>

            <div className="my-4 h-px" style={{ background: C.lineStrong }} />

            <div className="flex items-baseline justify-between gap-3">
              <span
                className="text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ color: C.ink }}
              >
                Total due today
              </span>
              <span className="flex items-baseline gap-2.5">
                {/* The two lines above, added up and struck. DERIVED, never
                    typed, so it can never disagree with them. aria-hidden
                    because a screen reader announcing two prices in a row
                    reads as a genuine change of price. */}
                <span
                  aria-hidden
                  className="font-heading text-[20px] font-semibold leading-none line-through"
                  style={{ color: C.inkMuted }}
                >
                  {CURRENCY_SYMBOL}
                  {FULL_VALUE}
                </span>
                <span
                  className="font-heading text-[36px] font-bold leading-none"
                  style={{ color: C.goldDeep }}
                >
                  {PRICE_LABEL}
                </span>
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
              Come to Day One. If it is not for you, tell us by the end of that
              day and we refund the {PRICE_LABEL} in full.
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
        watch="[data-checkout-cta]"
        label="5-Day Pain Reset"
        trailing={PRICE_LABEL}
        note={
          <>
            <ShieldCheck weight="fill" className="h-3 w-3 shrink-0" style={{ color: C.mintInk }} />
            Refund by end of Day One
          </>
        }
      >
        {/* Outside the <form>, so it is associated by id instead. That runs the
            same `submit` handler — including the validation reveal — rather
            than a second, drifting copy of it. */}
        <button
          type="submit"
          form="checkout-form"
          disabled={busy}
          className="lego-press lego-pulse-glow group inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold text-white disabled:cursor-progress disabled:opacity-70"
          style={{ background: C.blueFill }}
        >
          {busy ? (
            'Opening…'
          ) : (
            <>
              {/* The full label needs room the narrowest phones do not have. */}
              <span className="min-[400px]:hidden">Pay {PRICE_LABEL}</span>
              <span className="hidden min-[400px]:inline">
                Pay {PRICE_LABEL} &amp; Reserve
              </span>
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

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
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useState } from 'react';

import PaymentLogos from '@/components/PaymentLogos';

import { legoBrick, legoDelay } from '../_landing/lego-style';
import {
  C,
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

type Fields = { firstName: string; lastName: string; email: string; phone: string };

const INCLUDED = [
  { icon: VideoCamera, text: 'Five live, coach-led sessions on Zoom' },
  { icon: Clock, text: `Both daily timings, ${SESSION_TIMES}` },
  { icon: CheckCircle, text: 'Real-time form correction from Atul' },
  { icon: ShieldCheck, text: 'Your own Day 1 to Day 4 progress score' },
];

export default function CheckoutForm({ cancelled = false }: { cancelled?: boolean }) {
  const [f, setF] = useState<Fields>({ firstName: '', lastName: '', email: '', phone: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  /* Starts open, so the offer is visible without an interaction. Only the
     mobile disclosure reads this; above lg the summary is always expanded. */
  const [summaryOpen, setSummaryOpen] = useState(true);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim());
  const phoneOk = f.phone.replace(/\D/g, '').length >= 10;
  const firstOk = f.firstName.trim().length > 1;
  const lastOk = f.lastName.trim().length > 0;
  const valid = firstOk && lastOk && emailOk && phoneOk;
  const bad = (ok: boolean) => touched && !ok;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setFailed('');
    if (!valid || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: f.firstName.trim(),
          lastName: f.lastName.trim(),
          email: f.email.trim(),
          phone: f.phone.trim(),
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
          <span className="flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl"
              style={{ background: C.blueFill }}
            >
              <ShieldCheck weight="fill" className="h-4 w-4 text-white" />
            </span>
            <span className="font-heading text-[17px] font-bold" style={{ color: C.ink }}>
              SuperMe
            </span>
          </span>
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
          <h1
            className="mt-4 font-heading text-[30px] font-bold leading-[1.12] sm:text-[38px]"
            style={{ color: C.ink }}
          >
            Hold your place on the{' '}
            <span style={{ color: C.goldDeep }}>5-Day Pain Reset</span>
          </h1>
          <p className="mt-3 text-[15.5px]" style={{ color: C.inkSoft }}>
            Two minutes to book. Come to Day One, and if it is not for you, tell
            us by the end of that day and we refund the {PRICE_LABEL} in full.
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

            <form onSubmit={submit} noValidate className="mt-7 grid gap-4">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                <Field id="firstName" label="First name" placeholder="Priya"
                  value={f.firstName} onChange={set('firstName')}
                  bad={bad(firstOk)} autoComplete="given-name" />
                <Field id="lastName" label="Last name" placeholder="Sharma"
                  value={f.lastName} onChange={set('lastName')}
                  bad={bad(lastOk)} autoComplete="family-name" />
              </div>
              <Field id="email" label="Email address" placeholder="you@email.com"
                type="email" value={f.email} onChange={set('email')}
                bad={bad(emailOk)} autoComplete="email" />
              <Field id="phone" label="Mobile number" placeholder="07700 900000"
                type="tel" value={f.phone} onChange={set('phone')}
                bad={bad(phoneOk)} autoComplete="tel" />

              {touched && !valid && (
                <p className="text-[13px]" style={{ color: C.coralInk }}>
                  Please add your name, a valid email and a contactable number.
                </p>
              )}
              {failed && (
                <p className="text-[13px]" style={{ color: C.coralInk }}>
                  {failed}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
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

            <div className="my-5 h-px" style={{ background: C.lineStrong }} />

            <div className="flex items-baseline justify-between">
              <span className="text-[14px] font-semibold" style={{ color: C.ink }}>
                Total due today
              </span>
              <span
                className="font-heading text-[30px] font-bold leading-none"
                style={{ color: C.goldDeep }}
              >
                {PRICE_LABEL}
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
    </main>
  );
}

/* ── one input ──────────────────────────────────────────────────────── */
function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
  bad,
  type = 'text',
  autoComplete,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  bad: boolean;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em]"
        style={{ color: C.inkMuted }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="w-full rounded-xl px-4 py-3 text-[15px] outline-none transition-colors"
        style={{
          background: C.white,
          border: `1px solid ${bad ? C.coral : C.lineStrong}`,
          color: C.ink,
        }}
      />
    </div>
  );
}

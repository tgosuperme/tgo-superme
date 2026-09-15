'use client';

import { ArrowRight, CaretDown, Lock, MagnifyingGlass, X } from '@phosphor-icons/react/dist/ssr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getFbc, readCookie } from '@/components/MetaPixel';
import { restoreParams } from '@/lib/track';

import { COUNTRIES, DEFAULT_COUNTRY, searchCountries, type Country } from './country-codes';
import { C } from './shared';

/**
 * The details form, between picking a pass and paying.
 *
 * Four fields, then straight to Razorpay. It exists so the funnel stops being
 * blind to everyone who shows real intent and does not pay: the Payment Page
 * is not ours, so somebody who opens it and closes the tab leaves no trace at
 * all. These fields, collected one step earlier, are what let /api/lead fire
 * `abandoned_cart` and write a CRM row that does not depend on the payment.
 *
 * ── IT MUST NOT FEEL LIKE A TOLL GATE ───────────────────────────────────────
 * A form between a decision and a payment is a place to lose people, so
 * everything here is shaped to cost as little as possible:
 *
 *   · FOUR FIELDS. No city, no address, no "how did you hear about us".
 *   · IT SAYS WHY IT IS ASKING, once, in the subhead.
 *   · THE BUTTON NAMES THE NEXT STEP AND THE PRICE, so submitting reads as
 *     continuing to pay rather than as a separate commitment.
 *   · NOTHING IS ASKED TWICE. These values are pushed into Razorpay's own
 *     fields, leaving City as the only thing left to type there.
 *
 * ── THE COUNTRY CODE IS A SEPARATE CONTROL ──────────────────────────────────
 * Not a free-text prefix. Razorpay's `phone` field is declared type NUMBER, so
 * it takes digits and nothing else — a `+` in the value would be rejected and
 * the field would arrive empty. Holding the dialling code as its own piece of
 * state means the two shapes can both be produced exactly: digits-only for
 * Razorpay, E.164 for Meta and the CRM. Asking someone to type "+91" and
 * hoping is how that ends up wrong.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  product: 'base' | 'vip';
  /** "₹497" — shown on the button so this reads as part of paying. */
  priceLabel: string;
  /** Where to send them if /api/lead fails. */
  fallbackHref: string;
};

type Field = 'firstName' | 'lastName' | 'email' | 'phone';

const LABELS: Record<Field, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email address',
  phone: 'Mobile number',
};

/* Mirrors the server rules in /api/lead. Loose on purpose: the job is to catch
   a typo before it costs a round trip, not to argue with a real person about
   their own name. */
function validate(v: Record<Field, string>): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  if (v.firstName.trim().length < 2) e.firstName = 'Please enter your first name.';
  if (v.lastName.trim().length < 1) e.lastName = 'Please enter your last name.';
  if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v.email.trim())) {
    e.email = 'Please enter a valid email address.';
  }
  const digits = v.phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 13) {
    e.phone = 'Please enter a valid mobile number.';
  }
  return e;
}

export default function LeadFormModal({
  open,
  onClose,
  product,
  priceLabel,
  fallbackHref,
}: Props) {
  const [values, setValues] = useState<Record<Field, string>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');

  const firstRef = useRef<HTMLInputElement>(null);

  const set = (f: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    /* The phone box holds the NATIONAL number only — the dialling code lives
       in the selector beside it. Stripping non-digits as they type stops a
       pasted "+91 98765 43210" becoming a number with the code twice. */
    const next = f === 'phone' ? raw.replace(/\D/g, '').slice(0, 13) : raw;
    setValues((v) => ({ ...v, [f]: next }));
    setErrors((prev) => (prev[f] ? { ...prev, [f]: undefined } : prev));
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    /* A beat after paint, so the phone keyboard opens against a settled
       layout rather than one mid-transition. */
    const t = window.setTimeout(() => firstRef.current?.focus(), 80);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose, busy]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (busy) return;

      const found = validate(values);
      if (Object.keys(found).length > 0) {
        setErrors(found);
        return;
      }

      setBusy(true);
      setFailed('');

      const attr = restoreParams();
      /* E.164 for Meta and the CRM. /api/lead reduces it to digits for
         Razorpay's number-typed field; both shapes come from this one value so
         they cannot drift. */
      const e164 = `+${country.dial}${values.phone.replace(/\D/g, '')}`;

      try {
        const res = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: values.firstName.trim(),
            lastName: values.lastName.trim(),
            email: values.email.trim(),
            phone: e164,
            /* The national part on its own, because Razorpay's phone field
               renders its own country selector — prefilling it with the code
               included shows "+91 917977171379". */
            phoneNational: values.phone.replace(/\D/g, ''),
            countryCode: country.iso,
            product,
            fbp: readCookie('_fbp'),
            fbc: getFbc(),
            eventSourceUrl: window.location.href,
            utm: {
              source: attr.source,
              medium: attr.medium,
              campaign: attr.campaign,
              content: attr.content,
              term: attr.term,
              utm_id: attr.utm_id,
            },
            fbclid: attr.fbclid,
            fbclidTs: attr.ts,
            gclid: attr.gclid,
            referrer: attr.referrer,
            landingUrl: attr.landing_url,
          }),
        });

        const data = (await res.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };

        if (res.ok && data.url) {
          window.location.href = data.url;
          return;
        }
        /* A 400 is a field this browser let through and the server did not, so
           it is worth showing. Anything else is ours — send them on rather
           than stranding them on a form. */
        if (res.status === 400 && data.error) {
          setFailed(data.error);
          setBusy(false);
          return;
        }
        window.location.href = fallbackHref;
      } catch {
        window.location.href = fallbackHref;
      }
    },
    [busy, values, country, product, fallbackHref],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-form-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 h-full w-full cursor-default"
        style={{ background: 'rgba(0,32,98,0.55)' }}
      />

      <div
        className="relative max-h-[94vh] w-full max-w-[460px] overflow-y-auto rounded-t-3xl px-5 pb-7 pt-6 sm:rounded-3xl sm:px-8 sm:pb-8 sm:pt-7"
        style={{ background: C.white, boxShadow: '0 24px 60px -20px rgba(0,32,98,0.45)' }}
      >
        <button
          type="button"
          onClick={() => !busy && onClose()}
          aria-label="Close"
          className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-full"
          style={{ color: C.inkSoft }}
        >
          <X weight="bold" className="h-4 w-4" />
        </button>

        <h2
          id="lead-form-title"
          className="pr-9 font-heading text-[22px] font-extrabold leading-tight sm:text-[24px]"
          style={{ color: C.ink }}
        >
          Last step before payment
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: C.inkSoft }}>
          Your seat is booked against these details, and your joining link is sent
          here. Payment is on the next page.
        </p>

        <form onSubmit={submit} noValidate className="mt-6">
          {/* gap-4 on both axes. The old grid was gap-3.5 with a tighter label
              and the two name boxes read as one control split in half. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              field="firstName"
              value={values.firstName}
              error={errors.firstName}
              onChange={set('firstName')}
              inputRef={firstRef}
              autoComplete="given-name"
              placeholder="Priya"
            />
            <Input
              field="lastName"
              value={values.lastName}
              error={errors.lastName}
              onChange={set('lastName')}
              autoComplete="family-name"
              placeholder="Sharma"
            />
          </div>

          <div className="mt-4">
            <Input
              field="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={values.email}
              error={errors.email}
              onChange={set('email')}
              placeholder="priya@example.com"
            />
          </div>

          <div className="mt-4">
            <FieldLabel htmlFor="lead-phone">{LABELS.phone}</FieldLabel>
            <div className="flex gap-2.5">
              <CountrySelect value={country} onChange={setCountry} />
              <input
                id="lead-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={values.phone}
                onChange={set('phone')}
                placeholder="98765 43210"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'lead-phone-err' : 'lead-phone-hint'}
                className="min-w-0 flex-1 rounded-xl px-3.5 py-3 text-[16px] outline-none"
                style={{
                  background: C.white,
                  border: `1.5px solid ${errors.phone ? C.coral : C.line}`,
                  color: C.ink,
                }}
              />
            </div>
            {errors.phone ? (
              <p id="lead-phone-err" className="mt-1.5 text-[12px]" style={{ color: C.coralInk }}>
                {errors.phone}
              </p>
            ) : (
              <p id="lead-phone-hint" className="mt-1.5 text-[12px]" style={{ color: C.inkSoft }}>
                We send the Zoom link and daily reminders here.
              </p>
            )}
          </div>

          {failed ? (
            <p
              className="mt-4 rounded-xl px-3.5 py-2.5 text-[13px]"
              style={{ background: C.coralBed, color: C.coralInk }}
              role="alert"
            >
              {failed}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="lego-press group mt-6 inline-flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-full px-6 text-[16px] font-semibold text-white disabled:opacity-70"
            style={{ background: C.blueFill }}
          >
            {busy ? 'Taking you to payment…' : `Continue to Payment · ${priceLabel}`}
            {!busy ? (
              <ArrowRight
                weight="bold"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            ) : null}
          </button>

          <p
            className="mt-3.5 flex items-center justify-center gap-1.5 text-[12px]"
            style={{ color: C.inkSoft }}
          >
            <Lock weight="fill" className="h-3 w-3 shrink-0" />
            Secure payment by Razorpay · 100% Money Back Guarantee
          </p>

          {/* Quieter than the line above it and deliberately so: this is the
              disclosure that stops the Razorpay page and the bank statement
              reading as a stranger's name, which is a real refund trigger. It
              has to be present and legible, not persuasive. */}
          <p
            className="mt-2.5 text-center text-[11.5px] leading-relaxed"
            style={{ color: C.inkSoft, opacity: 0.8 }}
          >
            Note — You will be redirected to the payment page and Payments in India
            are collected by TrainerGoesOnline, SuperMe&rsquo;s authorised India
            delivery partner.
          </p>
        </form>
      </div>
    </div>
  );
}

/* ── the dialling-code selector ─────────────────────────────────────────── */
function CountrySelect({
  value,
  onChange,
}: {
  value: Country;
  onChange: (c: Country) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchCountries(q), [q]);

  /* Close on an outside click and on Escape. Escape is handled here rather
     than letting the dialog's own handler take it, so the first press closes
     the list and the second closes the form — which is the order a reader
     expects when a menu is open inside a dialog. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    const t = window.setTimeout(() => searchRef.current?.focus(), 40);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.clearTimeout(t);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setQ('');
          setOpen((o) => !o);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Country code, currently ${value.name} +${value.dial}`}
        className="flex h-full min-h-[50px] items-center gap-1.5 rounded-xl px-3 text-[15px]"
        style={{ background: C.white, border: `1.5px solid ${C.line}`, color: C.ink }}
      >
        <span aria-hidden className="text-[17px] leading-none">
          {value.flag}
        </span>
        <span className="font-medium">+{value.dial}</span>
        <CaretDown weight="bold" className="h-3 w-3 shrink-0" style={{ color: C.inkSoft }} />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-10 w-[280px] overflow-hidden rounded-2xl"
          style={{
            background: C.white,
            border: `1.5px solid ${C.line}`,
            boxShadow: '0 18px 40px -14px rgba(0,32,98,0.35)',
          }}
        >
          <div className="p-2" style={{ borderBottom: `1px solid ${C.line}` }}>
            <div className="relative">
              <MagnifyingGlass
                weight="bold"
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                style={{ color: C.inkSoft }}
              />
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search country or code"
                aria-label="Search country or code"
                className="w-full rounded-lg py-2 pl-8 pr-2.5 text-[14px] outline-none"
                style={{ background: C.paleBlue, color: C.ink }}
              />
            </div>
          </div>

          <ul className="max-h-[220px] overflow-y-auto py-1">
            {results.length === 0 ? (
              <li className="px-3 py-3 text-[13px]" style={{ color: C.inkSoft }}>
                No match. Try the dialling code.
              </li>
            ) : (
              results.map((c) => {
                const on = c.iso === value.iso;
                return (
                  <li key={c.iso}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={on}
                      onClick={() => {
                        onChange(c);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[14px]"
                      style={{
                        background: on ? C.lightBlue : 'transparent',
                        color: C.ink,
                      }}
                    >
                      <span aria-hidden className="text-[16px] leading-none">
                        {c.flag}
                      </span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span style={{ color: C.inkSoft }}>+{c.dial}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* ── shared bits ────────────────────────────────────────────────────────── */
function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-[12.5px] font-semibold"
      style={{ color: C.ink }}
    >
      {children}
    </label>
  );
}

function Input({
  field,
  value,
  error,
  onChange,
  inputRef,
  type = 'text',
  inputMode,
  autoComplete,
  placeholder,
}: {
  field: Field;
  value: string;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  type?: string;
  inputMode?: 'email' | 'tel' | 'text' | 'numeric';
  autoComplete?: string;
  placeholder?: string;
}) {
  const id = `lead-${field}`;
  return (
    <div>
      <FieldLabel htmlFor={id}>{LABELS[field]}</FieldLabel>
      <input
        id={id}
        ref={inputRef}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
        /* 16px minimum. Anything smaller and iOS zooms the whole page on
           focus, which on a payment step reads as the site breaking. */
        className="w-full rounded-xl px-3.5 py-3 text-[16px] outline-none"
        style={{
          background: C.white,
          border: `1.5px solid ${error ? C.coral : C.line}`,
          color: C.ink,
        }}
      />
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-[12px]" style={{ color: C.coralInk }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

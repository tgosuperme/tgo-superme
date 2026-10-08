'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { readAttribution } from '@/lib/attribution';
import { collectSignals } from '@/lib/client-signals';
import { COUNTRIES, OPEN_LEAD_EVENT, saveLead } from '@/lib/lead';
import { BOOK_HREF } from '@/lib/site';
import { trackRegistration } from '@/lib/track';

/* Opened by every Book button. Hands the details to /api/lead, then goes to
   booking whatever the response, so a Pabbly or Meta hiccup never costs a call. */
export default function LeadModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOpen = () => {
      setError('');
      setOpen(true);
    };
    window.addEventListener(OPEN_LEAD_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_LEAD_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, busy]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const firstName = String(f.get('firstName') ?? '').trim();
    const lastName = String(f.get('lastName') ?? '').trim();
    const email = String(f.get('email') ?? '').trim();
    const city = String(f.get('city') ?? '').trim();
    const country = COUNTRIES.find((c) => c.iso === String(f.get('country'))) ?? COUNTRIES[0];
    const dialCode = country.dial;
    const phone = String(f.get('phone') ?? '').replace(/\D/g, '');

    if (!firstName) return setError('Please enter your first name.');
    if (!lastName) return setError('Please enter your last name.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email address.');
    if (!city) return setError('Please enter your city.');
    if (phone.length < 6) return setError('Please enter your phone number.');

    setBusy(true);
    setError('');

    const a = readAttribution();
    try {
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          dialCode,
          countryCode: country.iso,
          city,
          phone,
          ...collectSignals(),
          utmSource: a.utmSource,
          utmMedium: a.utmMedium,
          utmCampaign: a.utmCampaign,
          utmContent: a.utmContent,
          utmTerm: a.utmTerm,
          referrer: a.referrer,
          landingUrl: a.landingUrl,
        }),
      });
    } catch {
      /* go to booking regardless */
    }

    trackRegistration();
    saveLead({ firstName, lastName, email, phone: `${dialCode}${phone}` });
    router.push(BOOK_HREF);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(0,32,98,0.55)] p-0 sm:items-center sm:p-6"
      onClick={() => !busy && setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-title"
        className="w-full max-w-[460px] rounded-t-2xl bg-white p-6 sm:rounded-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="lead-title" className="font-heading text-[22px] font-extrabold leading-snug text-ink">
            Book Your Free Pain Assessment Call
          </h2>
          <button
            type="button"
            onClick={() => !busy && setOpen(false)}
            aria-label="Close"
            className="-mr-2 -mt-1 rounded-md px-2 text-[26px] leading-none text-ink-soft"
          >
            ×
          </button>
        </div>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Share your details, then pick a time that suits you.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[14px] font-semibold text-ink">First name</span>
              <input ref={first} name="firstName" autoComplete="given-name" required className="sm-input mt-1.5" />
            </label>
            <label className="block">
              <span className="text-[14px] font-semibold text-ink">Last name</span>
              <input name="lastName" autoComplete="family-name" required className="sm-input mt-1.5" />
            </label>
          </div>
          <label className="block">
            <span className="text-[14px] font-semibold text-ink">Email</span>
            <input name="email" type="email" autoComplete="email" inputMode="email" required className="sm-input mt-1.5" />
          </label>
          <label className="block">
            <span className="text-[14px] font-semibold text-ink">City</span>
            <input name="city" autoComplete="address-level2" required className="sm-input mt-1.5" />
          </label>
          <div>
            <span className="text-[14px] font-semibold text-ink">Phone number</span>
            <div className="sm-phone-row mt-1.5 flex gap-2">
              <select name="country" defaultValue="in" aria-label="Country code" className="sm-input">
                {COUNTRIES.map((c) => (
                  <option key={c.iso} value={c.iso}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                name="phone"
                type="tel"
                autoComplete="tel-national"
                inputMode="tel"
                required
                aria-label="Phone number"
                className="sm-input min-w-0 flex-1"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-[14px] font-semibold text-[#C15151]">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="sm-cta w-full disabled:opacity-70">
            {busy ? 'One moment…' : 'Continue to pick a time'}
          </button>
          <p className="text-center text-[13px] text-ink-soft">
            Free 30-minute call · No obligation
          </p>
        </form>
      </div>
    </div>
  );
}

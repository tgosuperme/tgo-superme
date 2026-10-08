import type { Metadata } from 'next';

import BrandMark from '@/components/BrandMark';
import SiteFooter from '@/components/SiteFooter';
import { CALL_FIRST_STEP, CALL_PURPOSE } from '@/lib/call';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Your Call Is Booked | SuperMe',
  description: 'Your free 30-minute call with the SuperMe team is confirmed.',
  robots: { index: false, follow: false },
};

/* Prep items use the copy doc's own words (WHO THIS IS FOR), split at its seams. */
const HAVE_READY = [
  ['Your pain', 'Where it is, back, neck or knee, and how long it has lasted.'],
  ['Your history', 'The physios, scans and specialists you have already spent on.'],
  ['What you have tried', 'Stretches, rest, massages and painkillers, and how long each one held.'],
] as const;

function Tick({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`block ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

/* Reached only by booking, so it carries no booking CTA and fires no event:
   call_booked was reported on the booking page. */
export default function ThankYouPage() {
  return (
    <main className="min-h-screen bg-white font-body text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1120px] items-center justify-center px-5 py-4">
          <BrandMark height={32} priority />
        </div>
      </header>

      <section className="px-5 pb-14 pt-12 text-center md:pt-16">
        <div className="mx-auto max-w-[720px]">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white">
            <Tick className="h-8 w-8" />
          </span>
          <p className="mt-6 inline-flex rounded-full bg-brand-light px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-brand">
            Booking confirmed
          </p>
          <h1 className="mt-4 font-heading text-[clamp(28px,4.6vw,44px)] font-extrabold leading-[1.12]">
            Your free pain assessment call is <span className="text-brand">booked.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[580px] text-[16px] leading-relaxed text-ink-soft">
            The details are on their way to the email address you booked with. Put the time in your
            calendar now, and join on time: the call is 30 minutes.
          </p>
          <ul className="mt-7 flex flex-col items-center justify-center gap-3 text-[14.5px] font-medium sm:flex-row">
            {['Confirmation by email', 'Free 30-minute call · No obligation'].map((t) => (
              <li
                key={t}
                className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2"
              >
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand text-white">
                  <Tick />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-line px-5 py-14 md:py-16">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand">
            What this call is
          </p>
          <h2 className="mt-3 font-heading text-[clamp(24px,3.4vw,32px)] font-extrabold leading-tight">
            {CALL_FIRST_STEP.title}
          </h2>
          <p className="mx-auto mt-3 max-w-[560px] text-[15.5px] leading-relaxed text-ink-soft">
            {CALL_FIRST_STEP.body}
          </p>
          <p className="mx-auto mt-3 max-w-[560px] text-[15.5px] leading-relaxed text-ink-soft">
            {CALL_PURPOSE}
          </p>
        </div>
      </section>

      <section className="border-t border-line bg-brand-pale px-5 py-14 md:py-16">
        <div className="mx-auto max-w-[920px]">
          <p className="text-center text-[12px] font-bold uppercase tracking-[0.14em] text-brand">
            Before the call
          </p>
          <h2 className="mt-3 text-center font-heading text-[clamp(24px,3.4vw,32px)] font-extrabold leading-tight">
            Have these <span className="text-brand">in mind</span>
          </h2>
          <ol className="mt-9 grid gap-4 sm:grid-cols-3">
            {HAVE_READY.map(([t, b], i) => (
              <li key={t} className="rounded-2xl border border-line bg-white p-6">
                <span className="font-heading text-[28px] font-extrabold leading-none text-brand">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 font-heading text-[17px] font-bold">{t}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-line px-5 py-14 text-center md:py-16">
        <div className="mx-auto max-w-[620px]">
          <h2 className="font-heading text-[clamp(22px,3vw,28px)] font-extrabold">
            See you on the call.
          </h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">
            Need to move your time, or the confirmation has not arrived? Use the link in your
            confirmation email, or write to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

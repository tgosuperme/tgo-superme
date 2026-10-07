'use client';

import { useEffect, useRef, useState } from 'react';

import BrandMark from '@/components/BrandMark';
import SiteFooter from '@/components/SiteFooter';
import { readAttribution } from '@/lib/attribution';
import { CALENDLY_URL, CALL_FIRST_STEP, CALL_PURPOSE } from '@/lib/call';
import { CONTACT_EMAIL, THANK_YOU_HREF } from '@/lib/site';
import { trackBookingView, trackSchedule } from '@/lib/track';

const WIDGET_SRC = 'https://assets.calendly.com/assets/external/widget.js';

type CalendlyApi = { initInlineWidget: (o: { url: string; parentElement: HTMLElement }) => void };

/* Calendly's own utm_* parameters, so the booking record carries the ad that produced it. */
function calendlyUrl(): string {
  const a = readAttribution();
  const p = new URLSearchParams({ hide_gdpr_banner: '1', primary_color: '1054c2' });
  const utm: [string, string][] = [
    ['utm_source', a.utmSource],
    ['utm_medium', a.utmMedium],
    ['utm_campaign', a.utmCampaign],
    ['utm_content', a.utmContent],
    ['utm_term', a.utmTerm],
  ];
  for (const [k, v] of utm) if (v) p.set(k, v.slice(0, 200));
  return `${CALENDLY_URL}?${p.toString()}`;
}

export default function BookACallPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const box = useRef<HTMLDivElement>(null);
  const booted = useRef(false);
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    trackBookingView();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    const poll = window.setInterval(() => {
      if (cancelled) return;
      if (box.current?.querySelector('iframe')) {
        setState('ready');
        window.clearInterval(poll);
      } else if (Date.now() - started > 9000) {
        setState('failed');
        window.clearInterval(poll);
      }
    }, 300);

    let handedOff = false;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://calendly.com') return;
      const data = e.data as { event?: string; payload?: { invitee?: { uri?: string } } };
      if (data?.event !== 'calendly.event_scheduled' || handedOff) return;
      handedOff = true;
      const uid = data.payload?.invitee?.uri?.split('/').pop() ?? '';
      trackSchedule(uid, {});
      window.location.href = `${THANK_YOU_HREF}?booked=1`;
    };
    window.addEventListener('message', onMessage);

    // StrictMode runs this effect twice; a second init would mount a second widget.
    if (!booted.current) {
      booted.current = true;
      const init = () => {
        const api = (window as unknown as { Calendly?: CalendlyApi }).Calendly;
        if (api && box.current) api.initInlineWidget({ url: calendlyUrl(), parentElement: box.current });
      };
      if ((window as unknown as { Calendly?: CalendlyApi }).Calendly) {
        init();
      } else {
        const s = document.createElement('script');
        s.src = WIDGET_SRC;
        s.async = true;
        s.onload = init;
        s.onerror = () => !cancelled && setState('failed');
        document.head.appendChild(s);
      }
    }

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener('message', onMessage);
    };
  }, []);

  return (
    <main className="min-h-screen bg-white font-body text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1120px] items-center justify-center px-5 py-4">
          <BrandMark height={32} priority />
        </div>
      </header>

      <section className="px-5 pb-16 pt-10 md:pt-14">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="inline-flex items-center rounded-full bg-brand-light px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-brand">
            Free 30-minute call · No obligation
          </p>
          <h1 className="mt-5 font-heading text-[clamp(28px,4.6vw,44px)] font-extrabold leading-[1.12]">
            Pick a time for your <span className="text-brand">free pain assessment call</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[600px] text-[16px] leading-relaxed text-ink-soft">
            {CALL_PURPOSE}
          </p>
        </div>

        <div
          id="calendar"
          className="relative left-1/2 mt-10 w-[min(1040px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-line bg-white p-2 sm:p-4"
        >
          {state !== 'ready' && (
            <p
              className={`px-4 pt-6 text-center text-[14px] ${state === 'failed' ? 'font-semibold text-[#C15151]' : 'text-ink-soft'}`}
            >
              {state === 'failed'
                ? 'The calendar could not load here. Use the direct link below and your booking will work exactly the same.'
                : 'Loading the calendar.'}
            </p>
          )}
          <div ref={box} style={{ minWidth: 320, height: 700 }} />
        </div>

        <div className="mx-auto mt-5 max-w-[760px] text-center text-[14px] text-ink-soft">
          <p>
            Calendar not showing?{' '}
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">
              Open the booking page directly
            </a>
            .
          </p>
          <p className="mt-2">
            Can&rsquo;t find a time that works? Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand underline">
              {CONTACT_EMAIL}
            </a>{' '}
            with your name, phone number and a preferred day and time, and we will set it up with you.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-[640px] rounded-2xl border border-line bg-brand-pale p-6 sm:p-8">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand">On the call</p>
          <h2 className="mt-2 font-heading text-[21px] font-bold leading-snug">
            {CALL_FIRST_STEP.title}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{CALL_FIRST_STEP.body}</p>
          <ul className="mt-5 grid gap-2 text-[14.5px] font-medium">
            {['Free 30-minute call', 'No obligation'].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span aria-hidden className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand">
                  <svg viewBox="0 0 16 16" className="block h-3 w-3" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                </span>
                {t}
              </li>
            ))}
          </ul>
          <a
            href="#calendar"
            className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-brand px-6 text-[16px] font-bold text-white sm:w-auto"
          >
            Pick my time
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

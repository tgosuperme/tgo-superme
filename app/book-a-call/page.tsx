'use client';

import { useEffect, useRef, useState } from 'react';

import BrandMark from '@/components/BrandMark';
import SiteFooter from '@/components/SiteFooter';
import { readAttribution } from '@/lib/attribution';
import {
  CAL_LINK,
  CAL_NAMESPACE,
  CAL_ORIGIN,
  CAL_URL,
  CALL_FIRST_STEP,
  CALL_PURPOSE,
} from '@/lib/call';
import { getOrCreateExternalId } from '@/lib/client-signals';
import { CONTACT_EMAIL, THANK_YOU_HREF } from '@/lib/site';
import { trackBookingView, trackSchedule } from '@/lib/track';

type CalApi = ((...args: unknown[]) => void) & {
  loaded?: boolean;
  ns?: Record<string, (...args: unknown[]) => void>;
  q?: unknown[][];
};

/* Cal's own loader snippet, typed. It queues calls until embed.js lands. */
function loadCal(scriptSrc: string): CalApi {
  const w = window as unknown as { Cal?: CalApi };
  const push = (a: { q?: unknown[][] }, ar: unknown[]) => {
    (a.q = a.q || []).push(ar);
  };
  w.Cal =
    w.Cal ||
    function (...ar: unknown[]) {
      const cal = w.Cal as CalApi;
      if (!cal.loaded) {
        cal.ns = {};
        cal.q = cal.q || [];
        (document.head.appendChild(document.createElement('script')) as HTMLScriptElement).src =
          scriptSrc;
        cal.loaded = true;
      }
      if (ar[0] === 'init') {
        const api = function (...a: unknown[]) {
          push(api as unknown as { q?: unknown[][] }, a);
        } as unknown as ((...a: unknown[]) => void) & { q?: unknown[][] };
        const namespace = ar[1];
        api.q = api.q || [];
        if (typeof namespace === 'string') {
          cal.ns![namespace] = cal.ns![namespace] || api;
          push(cal.ns![namespace] as unknown as { q?: unknown[][] }, ar);
          push(cal as unknown as { q?: unknown[][] }, ['initNamespace', namespace]);
        } else {
          push(cal as unknown as { q?: unknown[][] }, ar);
        }
        return;
      }
      push(cal as unknown as { q?: unknown[][] }, ar);
    };
  return w.Cal as CalApi;
}

type CalBooking = {
  uid?: string;
  responses?: { email?: string; name?: string | { firstName?: string; lastName?: string } };
  attendees?: { email?: string; name?: string }[];
};

/* Cal's success payload has changed shape across embed versions, so every
   field is optional and a miss only costs match quality, never the redirect. */
function readBooking(e: unknown) {
  const data = (e as { detail?: { data?: { booking?: CalBooking; uid?: string } } })?.detail?.data;
  const b = data?.booking ?? {};
  const r = b.responses ?? {};
  const email = r.email || b.attendees?.[0]?.email || '';
  let firstName = '';
  let lastName = '';
  if (typeof r.name === 'object' && r.name) {
    firstName = r.name.firstName ?? '';
    lastName = r.name.lastName ?? '';
  } else {
    const parts = ((typeof r.name === 'string' ? r.name : b.attendees?.[0]?.name) ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    firstName = parts[0] ?? '';
    lastName = parts.slice(1).join(' ');
  }
  return { uid: b.uid || data?.uid || '', email, firstName, lastName };
}

/* Campaign context into Cal's booking metadata, so the booking record (and
   whatever Cal's webhook feeds) carries the ad that produced it. */
function calMetadata(): Record<string, string> {
  const a = readAttribution();
  const pairs: [string, string][] = [
    ['utm_source', a.utmSource],
    ['utm_medium', a.utmMedium],
    ['utm_campaign', a.utmCampaign],
    ['utm_content', a.utmContent],
    ['utm_term', a.utmTerm],
    ['fbclid', a.fbclid],
    ['external_id', getOrCreateExternalId()],
  ];
  const out: Record<string, string> = {};
  for (const [k, v] of pairs) if (v) out[`metadata[${k}]`] = v.slice(0, 200);
  return out;
}

export default function BookACallPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(
    CAL_LINK ? 'loading' : 'failed',
  );
  const booted = useRef(false);
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    trackBookingView();
  }, []);

  useEffect(() => {
    if (!CAL_LINK) return;
    let cancelled = false;
    const started = Date.now();
    const poll = window.setInterval(() => {
      if (cancelled) return;
      if (document.querySelector('#sm-cal iframe')) {
        setState('ready');
        window.clearInterval(poll);
      } else if (Date.now() - started > 9000) {
        setState('failed');
        window.clearInterval(poll);
      }
    }, 300);

    // StrictMode runs this effect twice; a second `inline` would mount a second embed.
    if (booted.current) {
      return () => {
        cancelled = true;
        window.clearInterval(poll);
      };
    }
    booted.current = true;

    try {
      const Cal = loadCal(`${CAL_ORIGIN}/embed/embed.js`);
      Cal('init', CAL_NAMESPACE, { origin: CAL_ORIGIN });
      const ns = Cal.ns![CAL_NAMESPACE];

      ns('inline', {
        elementOrSelector: '#sm-cal',
        calLink: CAL_LINK,
        config: { layout: 'month_view', useSlotsViewOnSmallScreen: 'true', ...calMetadata() },
      });

      ns('ui', {
        cssVarsPerTheme: { light: { 'cal-brand': '#1054C2' }, dark: { 'cal-brand': '#1054C2' } },
        theme: 'light',
        hideEventTypeDetails: false,
        layout: 'month_view',
      });

      let handedOff = false;
      ns('on', {
        action: 'bookingSuccessful',
        callback: (e: unknown) => {
          if (handedOff) return;
          handedOff = true;
          const b = readBooking(e);
          trackSchedule(b.uid, { email: b.email, firstName: b.firstName, lastName: b.lastName });
          window.location.href = `${THANK_YOU_HREF}?booked=1`;
        },
      });
    } catch {
      if (!cancelled) setState('failed');
      window.clearInterval(poll);
    }

    return () => {
      cancelled = true;
      window.clearInterval(poll);
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
          className="relative left-1/2 mt-10 w-[min(1040px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-line bg-white p-2 shadow-[0_4px_24px_-8px_rgba(0,32,98,0.10)] sm:p-4"
        >
          {!CAL_LINK ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-xl border-2 border-dashed border-[#C15151] bg-[#FFEDED] p-6 text-center text-[14px] font-semibold text-[#C15151]">
              [TODO] Booking calendar not connected. Set NEXT_PUBLIC_CAL_LINK to the Cal.com event
              (for example team-name/pain-assessment).
            </div>
          ) : (
            <>
              {state !== 'ready' && (
                <p
                  className={`px-4 pt-6 text-center text-[14px] ${state === 'failed' ? 'font-semibold text-[#C15151]' : 'text-ink-soft'}`}
                >
                  {state === 'failed'
                    ? 'The calendar could not load here. Use the direct link below and your booking will work exactly the same.'
                    : 'Loading the calendar.'}
                </p>
              )}
              <div id="sm-cal" className={state === 'ready' ? '' : 'min-h-[520px]'} />
            </>
          )}
        </div>

        <div className="mx-auto mt-5 max-w-[760px] text-center text-[14px] text-ink-soft">
          {CAL_URL && (
            <p>
              Calendar not showing?{' '}
              <a href={CAL_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">
                Open the booking page directly
              </a>
              .
            </p>
          )}
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

import type { Metadata } from 'next';

import BrandMark from '@/components/BrandMark';
import { OFFER } from '@/lib/offer';

import { C } from '../_landing/shared';

/**
 * /call · Part C, step two. Where the Razorpay hold redirects.
 *
 * ── "NOTHING TO BUY BEFORE THE CALL" IS THE WHOLE PAGE ──────────────────────
 * Someone has just paid ₹999 to hold a seat and has not yet been told which
 * option they are buying. The single thing that makes that sequence honest
 * rather than a bait is that the next step costs nothing and decides
 * everything — so that promise is on the page, above the fold, and the page
 * offers no way to pay from here.
 *
 * ── THE BOOKING EMBED IS OPTIONAL AT RUNTIME ────────────────────────────────
 * NEXT_PUBLIC_BOOKING_URL is likely to be set after this ships. Unset, the
 * page shows the instruction and the fallback rather than an empty iframe or a
 * blank screen: this is a post-payment page, and a buyer who has just paid
 * must never meet a broken one.
 *
 * The iframe is lazy and sandboxed to what a scheduler needs. Calendly is a
 * third party being handed an authenticated-feeling moment in our funnel; it
 * gets scripts, forms and same-origin (all of which it genuinely requires) and
 * nothing else — notably not top-level navigation, so it cannot redirect the
 * page out from under someone mid-booking.
 */

export const metadata: Metadata = {
  title: 'Book your call | SuperMe',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function CallPage() {
  const booking = OFFER.bookingUrl;

  return (
    <main className="min-h-screen font-body" style={{ background: C.paleBlue, color: C.ink }}>
      <header className="bg-white">
        <div className="mx-auto flex max-w-[1180px] items-center justify-center px-5 py-4 sm:justify-start md:px-8">
          <BrandMark height={40} priority />
        </div>
      </header>

      <div className="mx-auto max-w-[760px] px-4 py-10 sm:py-14">
        <div
          className="rounded-2xl px-5 py-4 text-center"
          style={{ background: C.greenBed }}
        >
          <p className="text-[15px] font-semibold" style={{ color: '#0F5A2C' }}>
            Your seat is held.
          </p>
        </div>

        <h1
          className="mt-6 text-center font-heading text-[26px] font-bold leading-tight sm:text-[32px]"
          style={{ color: C.ink }}
        >
          Book your prescription call
        </h1>
        <p
          className="mx-auto mt-3 max-w-[520px] text-center text-[15px] leading-relaxed"
          style={{ color: C.inkSoft }}
        >
          Pick a time in the next 72 hours. On the call: your two scores, your
          timings, and whether 30 or 60 sessions is right for you.{' '}
          <strong style={{ color: C.ink }}>Nothing to buy before the call.</strong>
        </p>

        <div className="mt-8">
          {booking ? (
            <div
              className="overflow-hidden rounded-3xl bg-white"
              style={{ border: `1px solid ${C.line}` }}
            >
              <iframe
                src={booking}
                title="Book your prescription call"
                loading="lazy"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                /* Tall enough that a month grid and a slot list both fit
                   without the iframe scrolling inside the page scroll, which
                   on a phone is the fastest way to lose a booking. */
                className="h-[720px] w-full border-0 sm:h-[780px]"
              />
            </div>
          ) : (
            <div
              className="rounded-3xl bg-white p-7 text-center"
              style={{ border: `1px solid ${C.line}` }}
            >
              <p className="text-[15px] font-semibold" style={{ color: C.ink }}>
                Atul&rsquo;s team will message you on WhatsApp to book your call.
              </p>
              <p className="mx-auto mt-2 max-w-[420px] text-[13.5px]" style={{ color: C.inkSoft }}>
                Usually within a few hours, and always within 72. Your seat and the
                challenge price are held until then.
              </p>
              {OFFER.whatsappCommunityUrl && (
                <a
                  href={OFFER.whatsappCommunityUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lego-press lego-pulse-glow mt-5 inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-[14.5px] font-semibold text-white"
                  style={{ background: '#25D366' }}
                >
                  Message us on WhatsApp
                </a>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[12px] leading-relaxed" style={{ color: C.inkMuted }}>
          Your {OFFER.holdPrice > 0 ? '₹' : ''}
          {OFFER.holdPrice > 0 ? OFFER.holdPrice : ''} hold is fully refundable and is
          credited to whichever option you choose. If you decide against both, it comes
          back.
        </p>
      </div>
    </main>
  );
}

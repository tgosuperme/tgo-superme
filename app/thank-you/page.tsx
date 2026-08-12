import {
  CalendarBlank,
  CheckCircle,
  Clock,
  EnvelopeSimple,
  ShieldCheck,
  VideoCamera,
} from '@phosphor-icons/react/dist/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';

import { getStripe, stripeConfigured } from '@/lib/stripe';

import { C, PRICE_LABEL, SESSION_TIMES, START_DATE } from '../_landing/shared';

/**
 * Post-payment page, and the Stripe success_url.
 *
 * The session id in the query string is NOT trusted as proof of payment: it is
 * retrieved from Stripe on the server and the payment_status is read from the
 * response. Someone who types the URL by hand gets the pending state, not a
 * confirmation.
 *
 * Nothing is fulfilled here and nothing is tracked here. Both live in the
 * webhook, because a buyer who pays and closes the tab never loads this page.
 */

export const metadata: Metadata = {
  title: "You're in | 5-Day Pain Reset",
  robots: { index: false, follow: false },
};

/* Stripe redirects here, so this can never be statically rendered. */
export const dynamic = 'force-dynamic';

type Search = { searchParams: { session_id?: string } };

export default async function ThankYouPage({ searchParams }: Search) {
  const sessionId = searchParams.session_id;

  let paid = false;
  let firstName = '';
  let email = '';

  if (sessionId && stripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      paid = session.payment_status === 'paid';
      firstName = session.metadata?.firstName ?? '';
      email = session.customer_details?.email ?? session.customer_email ?? '';
    } catch (err) {
      /* A bad or expired id lands in the pending state below rather than a
         crash: the payment may well have gone through, and telling a paying
         customer that something broke is worse than telling them to watch
         their inbox. */
      console.error('[thank-you] could not retrieve session', err);
    }
  }

  return (
    <main className="min-h-screen" style={{ background: C.paleBlue }}>
      <header style={{ background: C.white, borderBottom: `1px solid ${C.line}` }}>
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
        </div>
      </header>

      <div className="mx-auto max-w-[720px] px-5 py-14 md:px-8">
        <div
          className="rounded-3xl p-7 sm:p-10"
          style={{ background: C.white, border: `1px solid ${C.line}` }}
        >
          <span
            className="grid h-14 w-14 place-items-center rounded-2xl"
            style={{ background: paid ? C.mintBed : C.skyBed }}
          >
            {paid ? (
              <CheckCircle weight="fill" className="h-7 w-7" style={{ color: C.mintInk }} />
            ) : (
              <Clock weight="fill" className="h-7 w-7" style={{ color: C.skyInk }} />
            )}
          </span>

          <h1
            className="mt-5 font-heading text-[30px] font-bold leading-[1.14] sm:text-[38px]"
            style={{ color: C.ink }}
          >
            {paid ? (
              <>
                {firstName ? `${firstName}, your` : 'Your'} place is{' '}
                <span style={{ color: C.goldDeep }}>booked</span>
              </>
            ) : (
              <>
                We are <span style={{ color: C.goldDeep }}>confirming</span> your
                payment
              </>
            )}
          </h1>

          <p className="mt-3 text-[15.5px] leading-relaxed" style={{ color: C.inkSoft }}>
            {paid ? (
              <>
                That is {PRICE_LABEL} paid and your seat held for the cohort
                starting {START_DATE}. Your Zoom link and joining note are on
                their way to {email || 'the email address you gave us'}.
              </>
            ) : (
              <>
                If you have just paid, your seat is held and the joining email is
                on its way. Nothing more is needed from you. If you closed the
                payment page before finishing, your place is not held yet.
              </>
            )}
          </p>

          <div className="my-7 h-px" style={{ background: C.line }} />

          <p
            className="text-[10.5px] font-bold uppercase tracking-[0.16em]"
            style={{ color: C.inkMuted }}
          >
            What happens next
          </p>
          <ul className="mt-3 grid gap-3">
            {[
              {
                icon: EnvelopeSimple,
                text: 'Check your inbox for the joining email. If it is not there in ten minutes, look in spam and promotions.',
              },
              {
                icon: CalendarBlank,
                text: `The challenge starts ${START_DATE}. Put all five days in your calendar now.`,
              },
              {
                icon: Clock,
                text: `Sessions run at ${SESSION_TIMES}. Come to whichever suits you, and you can switch between them across the week.`,
              },
              {
                icon: VideoCamera,
                text: 'Join on a device you can stand in front of, with room to move. A phone propped up works.',
              },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
                  style={{ background: C.lightBlue }}
                >
                  <Icon weight="bold" className="h-3 w-3" style={{ color: C.blue }} />
                </span>
                <span className="text-[14px] leading-snug" style={{ color: C.inkSoft }}>
                  {text}
                </span>
              </li>
            ))}
          </ul>

          <p
            className="mt-7 flex items-start gap-2 rounded-2xl p-3.5 text-[12.5px] leading-snug"
            style={{ background: C.mintBed, color: C.ink }}
          >
            <ShieldCheck
              weight="fill"
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: C.mintInk }}
            />
            Come to Day One. If it is not for you, tell us by the end of that day
            and we refund the {PRICE_LABEL} in full.
          </p>

          {!paid && (
            <Link
              href="/checkout"
              className="mt-7 inline-flex min-h-[52px] items-center justify-center rounded-full px-7 text-[15px] font-semibold text-white"
              style={{ background: C.blueFill }}
            >
              Back to checkout
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

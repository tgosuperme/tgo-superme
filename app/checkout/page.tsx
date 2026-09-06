import type { Metadata } from 'next';
import Link from 'next/link';

import {
  ArrowLeft,
  CalendarBlank,
  CheckCircle,
  Clock,
  Lock,
  ShieldCheck,
  VideoCamera,
  WhatsappLogo,
} from '@phosphor-icons/react/dist/ssr';

import BrandMark from '@/components/BrandMark';
import { OFFER_REVALIDATE_SECONDS, resolveOffer } from '@/lib/offer';

import ProductPicker from '../_landing/product-picker';
import { C } from '../_landing/shared';

/**
 * /checkout — where the two passes are chosen, between the landing page and
 * Razorpay.
 *
 * ── WHY THIS IS ITS OWN STEP ────────────────────────────────────────────────
 * The selector used to sit in the price card on the landing page. That asked
 * the reader to make two decisions at once — whether to do this at all, and
 * which tier — in the middle of being persuaded of the first. The upgrade
 * question only means anything after "yes", so it waits until after the click.
 *
 * It is also NOT a post-payment upsell, which is what it replaced. Both prices
 * are visible while deciding, rather than a new one appearing on a countdown
 * after the money has moved.
 *
 * ── NOTHING IS COLLECTED HERE ───────────────────────────────────────────────
 * No name, no email, no card. Razorpay's hosted Payment Page collects all of
 * it, and duplicating those fields here would mean asking twice. This page
 * chooses a tier and hands off to /go, which stamps the attribution and
 * redirects to the matching Payment Page.
 *
 * ── THE PRICE IS RESOLVED SERVER-SIDE ───────────────────────────────────────
 * Same rule as the landing page: resolveOffer() reads the clock, and the
 * result is threaded down as a prop. A client component computing it would use
 * the visitor's clock. See lib/offer.ts.
 *
 * ── WHY IT LOOKS THE WAY IT DOES ────────────────────────────────────────────
 * This page previously opened on flat pale blue with a navy heading and a
 * white card, which read as a form rather than as a checkout — and a page that
 * reads as a form invites the buyer to wonder what it is going to ask for.
 *
 * So: a deep band at the top with the card overlapping it, which makes the
 * card the object on the page and the band its backdrop; a three-dot step rail
 * saying where they are and, crucially, that payment is the NEXT page; and two
 * quiet blocks under the card answering the two questions that surface at this
 * exact moment — what happens after I pay, and what if it does not work out.
 * Nothing here is a new sales argument. That work is done by the time anyone
 * arrives; adding more would reopen a decision already made.
 */

export const metadata: Metadata = {
  title: 'Choose your pass | 5-Day Pain Reset',
  description:
    'Standard or VIP. Both include five live coach-led sessions with Atul Mishra on Zoom.',
  /* noindex: the landing page is the entry point, and a search result that
     drops someone straight onto a price with no context converts badly and
     reads as a trap. */
  robots: { index: false, follow: false },
};

export const revalidate = OFFER_REVALIDATE_SECONDS;

export default function CheckoutPage({
  searchParams,
}: {
  searchParams: { unavailable?: string };
}) {
  const offer = resolveOffer();

  /* /go bounces back here when the Razorpay page for a tier is not configured.
     Without this the buyer taps Reserve, lands back where they started and
     concludes the button is broken — which, from their side, it is. */
  const unavailable =
    searchParams.unavailable === 'vip'
      ? 'VIP Pass'
      : searchParams.unavailable === 'base'
        ? 'Standard Pass'
        : '';

  const facts = [
    { icon: CalendarBlank, text: `Starts ${offer.startsLabel}` },
    { icon: Clock, text: offer.sessionTimes },
    { icon: VideoCamera, text: 'Live on Zoom' },
  ];

  const nextSteps = [
    {
      icon: Lock,
      bed: C.skyBed,
      fg: C.skyInk,
      text: 'Pay on Razorpay’s secure page.',
    },
    {
      icon: WhatsappLogo,
      bed: C.greenBed,
      fg: C.greenInk,
      text: 'Join the WhatsApp group from your confirmation page.',
    },
    {
      icon: VideoCamera,
      bed: C.mintBed,
      fg: C.mintInk,
      text: `Your Zoom link arrives before ${offer.startsLabel}.`,
    },
  ];

  return (
    <main className="min-h-screen font-body" style={{ background: C.paleBlue, color: C.ink }}>
      {/* ── header ──────────────────────────────────────────────────────
          Sticky, because the only two things a buyer wants at any scroll
          position on a checkout are the brand (am I still where I meant to
          be?) and the way out. Nothing else is allowed in the bar. */}
      <header
        className="bw-blur bw-edge-safe sticky top-0 z-30 bg-white/95"
        style={{ borderBottom: `1px solid ${C.line}` }}
      >
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-3.5 md:px-8">
          <BrandMark height={38} priority />
          {/* A way back that is findable but quiet. A checkout with no exit
              reads as a trap; one with a loud exit loses people who were
              only pausing. */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors hover:bg-black/[0.04]"
            style={{ color: C.inkMuted }}
          >
            <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>
      </header>

      {/* ── the deep band ───────────────────────────────────────────────
          Carries the three facts a buyer re-checks before paying (what, when,
          how) without those facts costing a section of their own. */}
      <section
        className="relative pb-24 pt-9 sm:pb-28 sm:pt-12"
        style={{ background: C.blueDeep }}
      >
        {/* A soft light source behind the heading, so the band is not a flat
            rectangle of navy. Pointer-events off: it is decoration and must
            never eat a tap meant for the header above or the card below. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[220px]"
          style={{
            background:
              'radial-gradient(ellipse 70% 100% at 50% 0%, rgba(42,170,239,0.34), rgba(42,170,239,0) 70%)',
          }}
        />

        <div className="relative mx-auto max-w-[640px] px-4 text-center">
          <Steps />

          <h1 className="mt-6 font-heading text-[27px] font-bold leading-[1.15] text-white sm:text-[34px]">
            Choose your pass
          </h1>
          <p
            className="mx-auto mt-3 max-w-[430px] text-[15px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.76)' }}
          >
            Both include all five live sessions with Atul. Nothing is charged
            until the next page.
          </p>

          {/* The same three facts as the landing hero, in the same order and
              the same words — a buyer who spots a difference between the two
              pages stops to work out which one is right. */}
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {facts.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-white"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              >
                <Icon weight="bold" className="h-3.5 w-3.5" style={{ color: C.bright }} />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pulled up over the band, so the card is the object on the page and
          the band is its backdrop rather than two stacked strips. */}
      {/* pb-28 on phones is the clearance for ProductPicker's fixed bottom
          bar (PICKER_BAR_SPACE). It lives here, at the end of the page, rather
          than as a spacer inside the picker — see the note there. */}
      <div className="relative z-10 mx-auto -mt-16 max-w-[640px] px-4 pb-28 sm:-mt-20 sm:pb-14">
        {unavailable && (
          <p
            role="alert"
            className="mb-4 rounded-2xl px-4 py-3.5 text-center text-[13.5px] leading-snug"
            style={{ background: C.coralBed, color: C.coralInk, border: '1px solid #F7C9C9' }}
          >
            The {unavailable} checkout is not available right now. Please try the
            other pass, or message us and we will hold your place.
          </p>
        )}

        <div
          className="rounded-3xl bg-white p-5 sm:p-7"
          style={{
            border: `1px solid ${C.lineStrong}`,
            boxShadow: '0 30px 70px -34px rgba(0,32,98,0.38)',
          }}
        >
          {/* The rise, restated at the point of decision — INSIDE the card and
              directly above the prices it applies to. Adrift between the
              heading and the card it read as a page banner rather than as a
              note about these two numbers. */}
          {!offer.closed && offer.urgencyLine && (
            <p
              className="mb-5 rounded-xl px-3.5 py-2.5 text-center text-[12.5px] font-medium leading-snug"
              style={{ background: C.peachBed, color: C.peachInk }}
            >
              {offer.urgencyLine}
            </p>
          )}

          <ProductPicker offer={offer} />

          {/* NO SECURITY LINE HERE. ProductPicker already ends with
              "100% Secure · UPI · Cards · NetBanking" plus the note about the
              billing name, so a second lock icon saying the same thing in
              different words read as a duplicate — and on a phone the two sat
              a spacer's height apart, which made it look like a bug. */}
        </div>

        {/* ── after the card ──────────────────────────────────────────────
            Two blocks answering the two objections that surface at exactly
            this moment. Set quietly: the selling is finished by the time
            anyone reaches this page, and adding more would reopen a decision
            that has already been made. */}
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-5" style={{ border: `1px solid ${C.line}` }}>
            <h2 className="font-heading text-[15px] font-bold" style={{ color: C.ink }}>
              What happens next
            </h2>
            <ol className="mt-3.5 space-y-3">
              {nextSteps.map(({ icon: Icon, bed, fg, text }) => (
                <li
                  key={text}
                  className="flex items-start gap-2.5 text-[13.5px] leading-snug"
                  style={{ color: C.inkSoft }}
                >
                  <span
                    className="mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ background: bed }}
                  >
                    <Icon weight="bold" className="h-3.5 w-3.5" style={{ color: fg }} />
                  </span>
                  {text}
                </li>
              ))}
            </ol>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{ background: C.greenBed, border: '1px solid #C6EBD4' }}
          >
            <h2
              className="flex items-center gap-2 font-heading text-[15px] font-bold"
              style={{ color: C.greenInk }}
            >
              <ShieldCheck weight="fill" className="h-4 w-4" />
              100% Money-Back Guarantee
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed" style={{ color: C.inkSoft }}>
              Come to Day 1. If it is not for you, tell us before Day 2 begins
              and we refund you in full.
            </p>
            <p
              className="mt-3 flex items-center gap-1.5 text-[12.5px] font-medium"
              style={{ color: C.greenInk }}
            >
              <CheckCircle weight="fill" className="h-3.5 w-3.5" />
              No questions, no forms.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Three steps, the second one current.
 *
 * Deliberately not a progress BAR: a bar implies a percentage and invites the
 * question of what the missing percentage is. Three labelled dots say the same
 * thing and also say what the remaining step IS — which is the actual worry at
 * this point, namely whether pressing the button charges the card immediately.
 */
function Steps() {
  /* The REAL order. Nothing is collected before this page, so "Choose pass"
     is first; name, email and phone are asked once, on Razorpay's page, in
     the same breath as the payment. Numbering it any other way would promise
     a details step of ours that does not exist. */
  const steps = ['Choose pass', 'Your details', 'Pay'] as const;
  /* Zero-based index of the step this page IS. */
  const current = 0;

  return (
    <ol className="flex items-center justify-center gap-2 sm:gap-3">
      {steps.map((label, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[11.5px] font-semibold uppercase tracking-[0.04em]"
              style={{
                background: now ? C.bright : 'rgba(255,255,255,0.10)',
                color: now ? C.blueDeep : 'rgba(255,255,255,0.62)',
              }}
            >
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                style={{
                  background: now ? 'rgba(0,32,98,0.16)' : 'rgba(255,255,255,0.14)',
                  color: now ? C.blueDeep : 'rgba(255,255,255,0.7)',
                }}
              >
                {done ? <CheckCircle weight="fill" className="h-3 w-3" /> : i + 1}
              </span>
              {/* The two inactive labels are hidden on a phone rather than
                  shrunk: at 360px three full labels wrap onto two lines and
                  the rail stops reading as a rail. The numbers stay, so
                  "2 of 3" is still legible. */}
              <span className={now ? '' : 'hidden sm:inline'}>{label}</span>
            </span>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className="h-px w-4 sm:w-6"
                style={{ background: 'rgba(255,255,255,0.22)' }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

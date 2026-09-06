/**
 * / · SuperMe 5-Day Pain Reset landing page.
 *
 * Server Component shell. The above-the-fold hero is pure static HTML, zero
 * JavaScript on the critical path, so it paints immediately. Everything below
 * loads as a separate deferred chunk via next/dynamic; ssr:true keeps all of
 * its markup in the server HTML, so there is no SEO or visual cost.
 *
 * ── THE PRICE IS RESOLVED HERE, ONCE ────────────────────────────────────────
 * resolveOffer() reads the clock and decides which rung of the ₹497/₹697/₹997
 * ladder is live. It is called exactly once, here, and threaded down as props.
 *
 * Nothing below may compute it for itself. Two reasons, both of which bite:
 * a client component would use the VISITOR'S clock, which is skewed often
 * enough to matter and would hydrate differently from the server; and a
 * module-scope constant is evaluated once per lambda cold start, so a warm
 * function would serve the old price for hours after a step boundary.
 */
import dynamic from 'next/dynamic';

import CtaTracker from '@/components/CtaTracker';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { OFFER_REVALIDATE_SECONDS, resolveOffer } from '@/lib/offer';

import { Hero, OfferStrip, SiteHeader } from './_landing/hero';
import { C } from './_landing/shared';
import StickyCta from './_landing/sticky-cta';

const BelowFold = dynamic(() => import('./_landing/below-fold'));

/**
 * Without this the page is built once and the price ladder never moves — the
 * whole point of resolving from the clock is lost to the static cache. Five
 * minutes is the worst-case lag at a step boundary, and the page still serves
 * from cache the rest of the time.
 */
export const revalidate = OFFER_REVALIDATE_SECONDS;

/**
 * overflow-x-CLIP on <main>, not hidden. `overflow-x: hidden` computes the
 * other axis to `auto`, which makes the element a scroll container — and a
 * scroll container becomes the containing block for every `position: sticky`
 * descendant. That silently broke the Why This Works card stack: the cards
 * were sticky, but they were sticking to <main> rather than the viewport, so
 * nothing ever pinned. `clip` does the same visual job without creating a
 * scrollport, so sticky keeps resolving against the viewport.
 */
export default function Page() {
  const offer = resolveOffer();

  return (
    <main
      className="overflow-x-clip font-body"
      style={{ background: C.white, color: C.ink }}
    >
      {/* One delegated listener for every CTA on the page, so the hero and the
          sections below it stay Server Components. Fires atc_event. */}
      <CtaTracker eventName={CHECKOUT_CONFIG.capi.events.addToCart} />
      <OfferStrip offer={offer} />
      <SiteHeader />
      <Hero offer={offer} />
      {/* The price card that used to sit here is GONE. Every price, the
          struck-through anchor, the savings badge and the two passes now live
          on /checkout — the landing page sells the challenge and the CTAs
          carry the price, which is all the pricing it needs. */}
      <BelowFold offer={offer} />
      {/* Docked from the first screen — see the note in sticky-cta.tsx. It
          renders its own flow spacer, so the footer is never covered. */}
      <StickyCta
        href={offer.ctaHref}
        title="5-Day Pain Reset"
        trailing={offer.priceLabel}
        label={
          offer.closed
            ? 'Join the next batch'
            : `Start Your 5-Day Reset · ${offer.priceLabel}`
        }
        date={offer.startsLabel}
        dateShort={offer.startsShortLabel}
        times={offer.sessionTimes}
      />
    </main>
  );
}

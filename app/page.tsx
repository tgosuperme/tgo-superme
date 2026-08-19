/**
 * / · SuperMe 5-Day Pain Reset landing page.
 *
 * Server Component shell. The above-the-fold hero is pure static HTML, zero
 * JavaScript on the critical path, so it paints immediately. Everything below
 * loads as a separate deferred chunk via next/dynamic; ssr:true keeps all of
 * its markup in the server HTML, so there is no SEO or visual cost.
 */
import dynamic from 'next/dynamic';

import CtaTracker from '@/components/CtaTracker';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

import { Hero, OfferStrip, SiteHeader } from './_landing/hero';
import { C, CHECKOUT_HREF, PRICE_LABEL, SESSION_TIMES_TZ, START_DATE } from './_landing/shared';
import StickyCta from './_landing/sticky-cta';

const BelowFold = dynamic(() => import('./_landing/below-fold'));

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
  return (
    <main
      className="overflow-x-clip font-body"
      style={{ background: C.white, color: C.ink }}
    >
      {/* One delegated listener for every CTA on the page, so the hero and the
          sections below it stay Server Components. Fires atc_event. */}
      <CtaTracker eventName={CHECKOUT_CONFIG.capi.events.addToCart} />
      <OfferStrip />
      <SiteHeader />
      <Hero />
      <BelowFold />
      {/* Docked from the first screen — see the note in sticky-cta.tsx. It
          renders its own flow spacer, so the footer is never covered. */}
      <StickyCta
        href={CHECKOUT_HREF}
        title="5-Day Pain Reset"
        trailing={PRICE_LABEL}
        label={`Start Your 5-Day Reset · ${PRICE_LABEL}`}
        date={START_DATE}
        times={SESSION_TIMES_TZ}
      />
    </main>
  );
}

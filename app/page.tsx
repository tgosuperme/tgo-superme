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
import RegisterModal from '@/components/RegisterModal';
import { OFFER_CONFIG } from '@/lib/offer-config';

import { Hero, OfferStrip, SiteHeader } from './_landing/hero';
import {
  C,
  FREE_LABEL,
  REGISTER_HREF,
  SESSION_TIMES,
  START_DATE,
} from './_landing/shared';
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
          sections below it stay Server Components. Fires atc_event.

          MOUNT ORDER WITH RegisterModal DOES NOT MATTER, and it is worth
          knowing why rather than discovering it later: this listens on the
          CAPTURE phase and the modal intercepts on the BUBBLE phase, so the
          event reaches the tracker first however the two are ordered here. */}
      <CtaTracker eventName={OFFER_CONFIG.capi.events.addToCart} />
      {/* Turns every /register link on the page into a dialog. The links stay
          real links, so no-JS readers and anyone this component fails for get
          the standalone page instead. */}
      <RegisterModal />
      <OfferStrip />
      <SiteHeader />
      <Hero />
      <BelowFold />
      {/* Docked from the first screen — see the note in sticky-cta.tsx. It
          renders its own flow spacer, so the footer is never covered. */}
      <StickyCta
        href={REGISTER_HREF}
        title="5-Day Pain Reset"
        trailing={FREE_LABEL}
        label="Claim My Free Place"
        shortLabel="Claim Free Place"
        date={START_DATE}
        times={SESSION_TIMES}
      />
    </main>
  );
}

/**
 * / · SuperMe 5-Day Pain Reset landing page.
 *
 * Server Component shell. The above-the-fold hero is pure static HTML, zero
 * JavaScript on the critical path, so it paints immediately. Everything below
 * loads as a separate deferred chunk via next/dynamic; ssr:true keeps all of
 * its markup in the server HTML, so there is no SEO or visual cost.
 */
import dynamic from 'next/dynamic';

import { Hero, OfferStrip } from './_landing/hero';
import { C } from './_landing/shared';

const BelowFold = dynamic(() => import('./_landing/below-fold'));

export default function Page() {
  return (
    <main
      className="overflow-x-hidden font-body"
      style={{ background: C.white, color: C.ink }}
    >
      <OfferStrip />
      <Hero />
      <BelowFold />
    </main>
  );
}

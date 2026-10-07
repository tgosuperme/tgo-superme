'use client';

import { useEffect } from 'react';

import { trackLandingView } from '@/lib/track';

/* Landing page only. CTA clicks deliberately fire nothing: the booking page
   reports its own arrival, so a reader tapping two CTAs is not counted twice. */
export default function FunnelTracker() {
  useEffect(() => {
    trackLandingView();
  }, []);

  return null;
}

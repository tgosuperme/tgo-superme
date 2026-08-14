'use client';

import { useEffect } from 'react';

import { captureParams } from '@/lib/track';

/**
 * Runs the attribution capture on every page.
 *
 * Mounted once in the root layout rather than per page, so a buyer who lands
 * on ANY url — landing page, a shared /checkout link, a legal page — has their
 * entry point and click ids recorded. Renders nothing.
 *
 * Deliberately not gated on NODE_ENV: unlike GA and Clarity this writes only
 * to the visitor's own browser and sends nothing anywhere, and having it run
 * locally is what makes the capture testable before it reaches production.
 */
export default function AttributionCapture() {
  useEffect(() => {
    captureParams();
  }, []);

  return null;
}

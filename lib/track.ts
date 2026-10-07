'use client';

import { collectSignals } from '@/lib/client-signals';
import { ga4GenerateLead, ga4ViewItem, once } from '@/lib/ga4';
import type { FunnelStage, SendableEvent } from '@/lib/meta-capi';

type Person = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
};

function capi(
  eventName: SendableEvent,
  extra: { stage?: FunnelStage; bookingUid?: string } & Person = {},
) {
  try {
    void fetch('/api/meta/event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventName, ...collectSignals(), ...extra }),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

/** Landing page view. Once per session. */
export function trackLandingView() {
  once('view_landing', () => {
    capi('ViewContent', { stage: 'landing' });
    ga4ViewItem('landing');
  });
}

/** Booking page arrival, which may be a direct entry from an email or ad. Once per session. */
export function trackBookingView() {
  once('view_booking', () => {
    capi('ViewContent', { stage: 'booking' });
    ga4ViewItem('booking');
  });
}

/** The call is booked. Keyed on Cal's booking uid so a back-navigation cannot count it twice. */
export function trackSchedule(bookingUid: string, person: Person) {
  once(`schedule_${bookingUid || 'anon'}`, () => {
    capi('Schedule', { bookingUid, ...person });
    ga4GenerateLead();
  });
}

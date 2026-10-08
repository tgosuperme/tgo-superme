'use client';

import { collectSignals } from '@/lib/client-signals';
import { ga4Event, ga4ViewItem, once } from '@/lib/ga4';
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

/** Details form submitted. Meta gets this one server side from /api/lead. */
export function trackRegistration() {
  ga4Event('registration_completed');
}

/** The call is booked. Keyed on Calendly's invitee uid so a back-navigation cannot count it twice. */
export function trackCallBooked(bookingUid: string, person: Person) {
  once(`booked_${bookingUid || 'anon'}`, () => {
    capi('call_booked', { bookingUid, ...person });
    ga4Event('call_booked');
  });
}

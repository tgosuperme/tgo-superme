import {
  browserContext,
  capiConfigured,
  sendCapiEvent,
  type CapiEventName,
} from '@/lib/meta-capi';
import { OFFER_CONFIG } from '@/lib/offer-config';

/**
 * Server half of the browser-fired custom events.
 *
 * TWO of the three events come through here now:
 *
 *     atc_event  a CTA tap on the landing page — no PII exists yet
 *     ic_event   the reader finishes step 1 of the registration form, so a
 *                first and last name exist and are sent as match keys
 *
 * `registration_complete` does not, and must not: it is fired from
 * /api/register, which is the request that actually records the registration.
 * Firing the conversion from a route anyone can POST to would make the ad
 * account trivially pollutable.
 *
 * The point of routing a browser event through our own server at all is that
 * the Pixel is blocked for a meaningful share of people. This request is made
 * by the reader's own browser, so the IP and user agent on it are genuinely
 * theirs, which is what makes the server copy worth sending.
 *
 * ALWAYS RETURNS 204. Tracking must never surface an error to someone trying
 * to register, and the browser has nothing useful to do with a failure anyway.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* A whitelist, not a passthrough. Without it this route is an open relay for
   writing arbitrary events into the ad account — and note that
   `registration_complete` is deliberately NOT on it. */
const ALLOWED: CapiEventName[] = [
  OFFER_CONFIG.capi.events.addToCart,
  OFFER_CONFIG.capi.events.initiateCheckout,
];

type Body = {
  event?: string;
  eventId?: string;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
  /* Optional, and only ever present on ic_event: the name the reader has just
     typed into step 1. Sending it lifts the match quality of a mid-funnel
     event that would otherwise be cookies-only. */
  firstName?: string;
  lastName?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const event = (body.event ?? '') as CapiEventName;
    if (!ALLOWED.includes(event)) {
      console.warn(`[track] rejected event name: ${String(body.event)}`);
      return new Response(null, { status: 204 });
    }

    const eventId = (body.eventId ?? '').trim().slice(0, 100);
    if (!eventId) return new Response(null, { status: 204 });

    if (!capiConfigured()) return new Response(null, { status: 204 });

    await sendCapiEvent({
      eventName: event,
      eventId,
      /* Seconds, not milliseconds. Meta rejects the latter. */
      eventTime: Math.floor(Date.now() / 1000),
      eventSourceUrl: (body.eventSourceUrl ?? '').slice(0, 400),
      user: {
        /* Whatever is known at this point in the funnel. On atc_event that is
           the cookies, IP and user agent alone; on ic_event a name has been
           typed and is hashed into the event by sendCapiEvent. */
        firstName: (body.firstName ?? '').slice(0, 100),
        lastName: (body.lastName ?? '').slice(0, 100),
        fbp: (body.fbp ?? '').slice(0, 255),
        fbc: (body.fbc ?? '').slice(0, 255),
        ...browserContext(req),
      },
    });
  } catch (err) {
    console.error('[track] failed', err);
  }

  return new Response(null, { status: 204 });
}

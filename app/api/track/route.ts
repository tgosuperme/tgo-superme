import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import {
  browserContext,
  capiConfigured,
  sendCapiEvent,
  type CapiEventName,
} from '@/lib/meta-capi';

/**
 * Server half of the browser-fired custom events.
 *
 * Only atc_event comes through here. ic_event is sent from /api/checkout,
 * which is already handling that exact click and knows the buyer's details,
 * and `sales` is sent from the Stripe webhook.
 *
 * The point of routing a browser event through our own server at all is that
 * the Pixel is blocked for a meaningful share of people. This request is made
 * by the buyer's own browser, so the IP and user agent on it are genuinely
 * theirs, which is what makes the server copy worth sending.
 *
 * ALWAYS RETURNS 204. Tracking must never surface an error to someone trying
 * to buy, and the browser has nothing useful to do with a failure anyway.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* A whitelist, not a passthrough. Without it this route is an open relay for
   writing arbitrary events into the ad account. */
const ALLOWED: CapiEventName[] = [CHECKOUT_CONFIG.capi.events.addToCart];

type Body = {
  event?: string;
  eventId?: string;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
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
        /* No PII at this point in the funnel: the reader has only tapped a
           button. The cookies, IP and user agent are the whole match set. */
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

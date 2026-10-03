import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import {
  browserContext,
  capiConfigured,
  sendCapiEvent,
  type CapiEventName,
} from '@/lib/meta-capi';

/**
 * Server half of the one event the browser starts.
 *
 * Only atc_event comes through here. registration_complete is sent from
 * /api/register, which is already handling that submission and knows who the
 * person is; ic_event from /api/checkout; `sales` from the Stripe webhook.
 *
 * The point of routing a browser event through our own server at all is that
 * the Pixel is blocked for a meaningful share of people. This request is made
 * by the reader's own browser, so the IP and user agent on it are genuinely
 * theirs, which is what makes the server copy worth sending.
 *
 * ALWAYS RETURNS 204. Tracking must never surface an error to somebody trying
 * to register, and the browser has nothing useful to do with a failure anyway.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* A whitelist, not a passthrough. Without it this route is an open relay for
   writing arbitrary events into the ad account: the URL is public, so anyone
   could post `sales` at it all day. */
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
        /* NO PII IS AVAILABLE HERE, and that is not a gap to be filled later.
           This fires as the registration form opens: the reader has tapped a
           button and nothing else. The cookies, IP and user agent are the
           entire match set, which is why this event's EMQ is structurally
           lower than the three that follow it and why the ad account should
           not be optimised on it. */
        fbp: (body.fbp ?? '').slice(0, 255),
        fbc: (body.fbc ?? '').slice(0, 255),
        ...browserContext(req),
      },
      /* No value and no currency. The seat is free, so a figure here would be
         inventing revenue on a form-open. */
    });
  } catch (err) {
    console.error('[track] failed', err);
  }

  return new Response(null, { status: 204 });
}

import { randomUUID } from 'node:crypto';

import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { browserContext, capiConfigured, sendCapiEvent } from '@/lib/meta-capi';
import { getStripe, siteOrigin, stripeConfigured } from '@/lib/stripe';

/**
 * Opens a Stripe Checkout Session for the 5-Day Pain Reset.
 *
 * GBP offer on a UK account, so this is Stripe rather than the Razorpay flow
 * the postpartum funnel uses.
 *
 * Shape of the decisions taken here, so they are not re-litigated later:
 *
 *   · INLINE price_data, not a dashboard Price ID. CHECKOUT_CONFIG is already
 *     the single source of truth for the amount and it drives every price on
 *     the page; a dashboard Price would be a second source that can silently
 *     disagree with what the buyer just read.
 *   · The amount is read from config ON THE SERVER and never from the request
 *     body, so a crafted POST cannot open checkout at a lower price.
 *   · The buyer's details are collected on our form and passed through as
 *     metadata, so the webhook can fulfil without a database.
 *   · No trial, no subscription: mode is a one-off payment.
 *
 * The Meta CAPI Purchase belongs in the webhook, not on the thank-you page. A
 * buyer who pays and closes the tab must still be counted.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  firstName?: string;
  lastName?: string;
  email?: string;
  /** Already E.164 from the form, e.g. "+447700900000". */
  phone?: string;
  /** ISO 3166-1 alpha-2 the buyer picked, kept for segmenting later. */
  phoneCountry?: string;
  city?: string;
  /* ── Meta match keys, read from the browser by the form ──────────────
     These exist ONLY in the buyer's browser and only until they leave for
     Stripe, so they are collected here and carried through the payment in
     the session's metadata. See lib/meta-capi.ts for the full path. */
  fbp?: string;
  fbc?: string;
  /** Minted in the browser; the ic_event is sent server-side from here. */
  icEventId?: string;
  eventSourceUrl?: string;
  /* ── attribution, from lib/track.ts ──────────────────────────────────
     Last-touch UTM, plus the first-touch entry point. Carried to the CRM row
     through the session metadata, exactly like the match keys above. */
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  fbclid?: string;
  /** Click time in ms, for the fbc rebuild below. */
  fbclidTs?: number;
  gclid?: string;
  referrer?: string;
  landingUrl?: string;
};

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    /* an empty body is still a bad request below */
  }

  const firstName = (body.firstName ?? '').trim();
  const lastName = (body.lastName ?? '').trim();
  const email = (body.email ?? '').trim();
  const phone = (body.phone ?? '').trim();
  /* Two letters or nothing: this only ever comes from our own <select>, so
     anything else is a crafted request and is dropped rather than argued with. */
  const phoneCountry = /^[A-Za-z]{2}$/.test(body.phoneCountry ?? '')
    ? (body.phoneCountry as string).toUpperCase()
    : '';
  /* Collected on the form and carried through to the webhook. Capped at 100
     characters: Stripe rejects metadata values over 500, and a city that long
     is a paste accident rather than a place. */
  const city = (body.city ?? '').trim().slice(0, 100);

  /* Metadata values are capped at 500 characters by Stripe, so every one of
     these is trimmed to fit rather than risking a rejected session over a
     tracking field. A truncated fbc is useless, but a failed checkout is
     worse. */
  const fbp = (body.fbp ?? '').trim().slice(0, 255);
  const eventSourceUrl = (body.eventSourceUrl ?? '').trim().slice(0, 400);

  /* ── attribution ──────────────────────────────────────────────────────
     Referrer and landing URL are real URLs and can be long. Stripe rejects a
     metadata value over 500 characters and the whole session with it, so both
     are cut well short of that: a truncated audit field is a nuisance, a
     failed checkout is a lost sale. */
  const utm = body.utm ?? {};
  const utmSource = (utm.source ?? '').trim().slice(0, 100);
  const utmMedium = (utm.medium ?? '').trim().slice(0, 100);
  const utmCampaign = (utm.campaign ?? '').trim().slice(0, 200);
  const utmContent = (utm.content ?? '').trim().slice(0, 200);
  const utmTerm = (utm.term ?? '').trim().slice(0, 200);
  const gclid = (body.gclid ?? '').trim().slice(0, 255);
  const referrer = (body.referrer ?? '').trim().slice(0, 400);
  const landingUrl = (body.landingUrl ?? '').trim().slice(0, 400);
  const fbclid = (body.fbclid ?? '').trim().slice(0, 255);

  /* ── HYBRID fbc ───────────────────────────────────────────────────────
     Prefer the real `_fbc` cookie the Pixel wrote. When it is absent — routine
     on iOS and inside in-app browsers, where the Pixel may never have run —
     rebuild it from the click id the capture layer stored.

     This is the single highest-leverage field for both EMQ and for Meta
     crediting the correct ad, so it is never left cookie-only. Rebuilt HERE,
     once, so the same value reaches the ic_event, the session metadata, the
     `sales` event and the CRM row. */
  const cookieFbc = (body.fbc ?? '').trim().slice(0, 255);
  const fbclidTs = Number(body.fbclidTs) > 0 ? Number(body.fbclidTs) : Date.now();
  const fbc = cookieFbc || (fbclid ? `fb.1.${fbclidTs}.${fbclid}` : '');

  /* THE IP AND USER AGENT MUST BE TAKEN HERE. The Stripe webhook that fires
     the `sales` event is a request from Stripe's servers, so reading them
     there would send Meta Stripe's datacentre instead of the buyer. */
  const { clientIp, clientUserAgent } = browserContext(req);

  /* One id, shared by the browser's `sales` event on the thank-you page and by
     the server event from the webhook, so Meta collapses the pair into a
     single conversion instead of counting the sale twice. */
  const capiEventId = randomUUID();
  const icEventId = (body.icEventId ?? '').trim().slice(0, 100);

  /* Re-checked here, not just in the form. The client validation is for the
     buyer's benefit; this is the part that actually holds, because a crafted
     POST never touches the form at all. Kept deliberately looser than the
     client rules — the server's job is to reject junk, not to second-guess a
     real person's name or an unusual dialling plan. */
  if (!email || !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) {
    return Response.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (firstName.length < 2) {
    return Response.json({ error: 'A first name is required.' }, { status: 400 });
  }
  if (lastName.length < 1) {
    return Response.json({ error: 'A last name is required.' }, { status: 400 });
  }
  /* E.164 allows 15 digits at most; anything under 8 including the country
     code cannot be a reachable mobile. */
  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    return Response.json({ error: 'A valid mobile number is required.' }, { status: 400 });
  }
  if (city.length < 2) {
    return Response.json({ error: 'A city or town is required.' }, { status: 400 });
  }

  if (!stripeConfigured()) {
    console.error('[checkout] STRIPE_SECRET_KEY is not set, cannot open a session');
    return Response.json(
      {
        error:
          'Payment is not switched on yet. Please email us and we will hold your place.',
      },
      { status: 503 },
    );
  }

  const origin = siteOrigin(req);
  const price = `${CHECKOUT_CONFIG.currencySymbol}${CHECKOUT_CONFIG.amountGbpString}`;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      /* Keeps the buyer's card details off our servers and lets Stripe offer
         Apple Pay and Google Pay from the same session. Which methods appear
         is controlled in the Stripe dashboard, not here. */
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CHECKOUT_CONFIG.currency.toLowerCase(),
            unit_amount: CHECKOUT_CONFIG.amountPence,
            product_data: {
              name: '5-Day Pain Reset Challenge',
              description: `Live, coach-led on Zoom. Starts ${CHECKOUT_CONFIG.startDate}. Sessions at ${CHECKOUT_CONFIG.sessionTimes}.`,
            },
          },
        },
      ],
      /* Everything the webhook needs to fulfil without a database. Stripe caps
         each value at 500 characters, which none of these approach. */
      metadata: {
        funnel: CHECKOUT_CONFIG.funnelSlug,
        firstName,
        lastName,
        phone,
        phoneCountry,
        city,
        startDate: CHECKOUT_CONFIG.startDate,
        sessionTimes: CHECKOUT_CONFIG.sessionTimes,
        /* Meta's parcel, opened again in the webhook. Stripe returns metadata
           verbatim on checkout.session.completed, which is what makes this
           work without a database. */
        capiEventId,
        fbp,
        fbc,
        clientIp,
        clientUserAgent,
        eventSourceUrl,
        /* ── attribution, for the CRM row ────────────────────────────
           Stripe allows 50 metadata keys; this brings the total to 22. */
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        fbclid,
        gclid,
        referrer,
        landingUrl,
      },
      payment_intent_data: {
        description: `5-Day Pain Reset (${price}): ${firstName} ${lastName}`.trim(),
        /* Copied onto the PaymentIntent as well, so a refund actioned from the
           payments screen still shows who it belongs to. */
        metadata: { funnel: CHECKOUT_CONFIG.funnelSlug, firstName, lastName, phone },
      },
      /* session_id lets the thank-you page confirm the payment server-side
         instead of trusting the redirect. */
      success_url: `${origin}${CHECKOUT_CONFIG.thankYouPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${CHECKOUT_CONFIG.checkoutPath}?cancelled=1`,
      /* A buyer who wanders off should not come back to a dead session. */
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    });

    if (!session.url) {
      console.error('[checkout] Stripe returned a session with no URL', session.id);
      return Response.json(
        { error: 'Could not open the payment page. Please try again.' },
        { status: 502 },
      );
    }

    /* ── ic_event, server half ────────────────────────────────────────
       Sent AFTER the session opens, so a Meta outage can never stop someone
       paying, and awaited rather than fired and forgotten, because a
       serverless function can be frozen the moment it returns a response and
       a dangling promise would simply never be delivered.

       Everything Meta can match on is already in hand at this point: the
       details the buyer just typed, their real IP and user agent from THIS
       request, and the cookies the form sent with it. */
    if (capiConfigured() && icEventId) {
      try {
        await sendCapiEvent({
          eventName: CHECKOUT_CONFIG.capi.events.initiateCheckout,
          eventId: icEventId,
          eventTime: Math.floor(Date.now() / 1000),
          eventSourceUrl,
          user: {
            email,
            phone,
            firstName,
            lastName,
            city,
            country: phoneCountry || 'GB',
            fbp,
            fbc,
            clientIp,
            clientUserAgent,
          },
          value: CHECKOUT_CONFIG.capi.value,
          currency: CHECKOUT_CONFIG.capi.currency,
        });
      } catch (err) {
        /* Logged, never thrown: the session is already open and the buyer is
           about to be redirected. Losing an ic_event is a reporting gap;
           failing this response is a lost sale. */
        console.error('[checkout] ic_event failed', err);
      }
    }

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[checkout] Stripe session create failed', err);
    return Response.json(
      { error: 'Could not open the payment page. Please try again.' },
      { status: 502 },
    );
  }
}

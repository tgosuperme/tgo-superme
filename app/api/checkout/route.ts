import { randomUUID } from 'node:crypto';

import { cookies } from 'next/headers';

import { browserContext } from '@/lib/meta-capi';
import { OFFER_CONFIG } from '@/lib/offer-config';
import { getStripe, siteOrigin, stripeConfigured } from '@/lib/stripe';

/**
 * Opens a Stripe Checkout Session for the VIP upgrade.
 *
 * Reached ONLY from /upgrade, and only by someone who has already registered.
 * The free challenge does not come through here and never touches Stripe.
 *
 * Shape of the decisions taken here, so they are not re-litigated later:
 *
 *   · THE BUYER'S IDENTITY COMES FROM THE httpOnly REGISTRATION COOKIE, never
 *     from the request body. That is the whole reason the cookie carries more
 *     than a first name. A crafted POST cannot attach someone else's name and
 *     email to a payment, and the VIP row is guaranteed to describe the person
 *     who actually registered. No cookie means no registration, so there is
 *     nothing to upgrade and this returns 401.
 *   · THE AMOUNT IS READ FROM CONFIG ON THE SERVER and never from the body,
 *     so a crafted request cannot open checkout at a lower price.
 *   · INLINE price_data, not a dashboard Price ID. OFFER_CONFIG is already the
 *     single source of truth for the amount and it drives the figure the
 *     reader just saw on the OTO; a dashboard Price would be a second source
 *     that can silently disagree with it.
 *   · No trial, no subscription: mode is a one-off payment. The OTO says "one
 *     payment, no subscription" and this is the line that has to be true.
 *
 * ── WHY SO MUCH GOES INTO metadata ──────────────────────────────────────────
 * Everything the VIP Pabbly row and the `sales` CAPI event will need is packed
 * into the session's metadata here, because the Stripe webhook that eventually
 * reads it is a request from STRIPE's servers: no cookies, no client IP, no
 * user agent, no localStorage. Anything not parked here is gone by then.
 *
 * That includes the full attribution set. The VIP sheet has to answer "which
 * ad produced this sale?" on its own, without a lookup back into the
 * registrations sheet — see the note at the top of lib/pabbly.ts.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  /* ── Meta match keys, read from the browser on the OTO page ──────────
     Same browser and same session as the registration, so these are the
     reader's own. Sent from the client because a cookie set by Meta's Pixel
     is not something the server can read for itself. */
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
  /* ── attribution, from lib/track.ts ──────────────────────────────────
     Re-read in the browser at OTO time rather than stored in the cookie, so
     localStorage stays the single source of truth for UTMs. */
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

type Registration = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneCountry?: string;
  city?: string;
};

export async function POST(req: Request) {
  /* ── who is this? the cookie decides, not the request ───────────────── */
  const raw = cookies().get(OFFER_CONFIG.registrationCookie)?.value;
  if (!raw) {
    return Response.json(
      { error: 'Please register first — we could not find your details.' },
      { status: 401 },
    );
  }

  let reg: Registration = {};
  try {
    reg = JSON.parse(decodeURIComponent(raw)) as Registration;
  } catch {
    return Response.json(
      { error: 'Your session expired. Please register again.' },
      { status: 401 },
    );
  }

  const leadId = (reg.id ?? '').trim();
  const firstName = (reg.firstName ?? '').trim();
  const lastName = (reg.lastName ?? '').trim();
  const email = (reg.email ?? '').trim();
  const phone = (reg.phone ?? '').trim();
  const phoneCountry = (reg.phoneCountry ?? '').trim();
  const city = (reg.city ?? '').trim();

  if (!leadId || !email) {
    return Response.json(
      { error: 'Your session expired. Please register again.' },
      { status: 401 },
    );
  }

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    /* An empty body only costs attribution quality, never the payment. */
  }

  /* Metadata values are capped at 500 characters by Stripe, and an oversized
     one rejects the WHOLE session — so every field is trimmed to fit rather
     than risking a failed upgrade over a tracking string. A truncated
     referrer is a nuisance; a checkout that will not open is a lost sale. */
  const fbp = (body.fbp ?? '').trim().slice(0, 255);
  const eventSourceUrl = (body.eventSourceUrl ?? '').trim().slice(0, 400);

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
     Prefer the real `_fbc` cookie the Pixel wrote. When it is absent —
     routine on iOS and inside in-app browsers, where the Pixel may never have
     run — rebuild it from the click id the capture layer stored.

     This is the single highest-leverage field for both EMQ and for Meta
     crediting the correct ad, so it is never left cookie-only. Rebuilt HERE,
     once, so the same value reaches the `sales` event and the VIP CRM row. */
  const cookieFbc = (body.fbc ?? '').trim().slice(0, 255);
  const fbclidTs = Number(body.fbclidTs) > 0 ? Number(body.fbclidTs) : Date.now();
  const fbc = cookieFbc || (fbclid ? `fb.1.${fbclidTs}.${fbclid}` : '');

  /* THE IP AND USER AGENT MUST BE TAKEN HERE. This request is the buyer's own
     browser; the webhook that fires the `sales` event is Stripe's, so reading
     them there would send Meta a Stripe datacentre instead of the buyer. */
  const { clientIp, clientUserAgent } = browserContext(req);

  if (!stripeConfigured()) {
    console.error('[checkout] STRIPE_SECRET_KEY is not set, cannot open a session');
    return Response.json(
      {
        error:
          'The upgrade is not available right now. Your free place is already held.',
      },
      { status: 503 },
    );
  }

  /* One id, minted here and shared by the `sales` CAPI event and the VIP CRM
     row, so the two can never disagree about which purchase they describe. */
  const capiEventId = randomUUID();
  const origin = siteOrigin(req);
  const vip = OFFER_CONFIG.vip;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      /* Keeps card details off our servers and lets Stripe offer Apple Pay and
         Google Pay from the same session. Which methods appear is controlled
         in the Stripe dashboard, not here. */
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: vip.currency.toLowerCase(),
            unit_amount: vip.amountPence,
            product_data: {
              name: vip.productName,
              description: `Recordings of all 5 sessions kept for life, priority attention in the room, and 2 extra guides. Challenge starts ${OFFER_CONFIG.startDate}.`,
            },
          },
        },
      ],
      /* Everything the webhook needs to write the VIP row and fire `sales`
         without a database. Stripe caps each value at 500 characters, which
         none of these approach, and allows 50 keys — this uses about 26. */
      metadata: {
        funnel: OFFER_CONFIG.funnelSlug,
        tier: 'vip',
        /* The thread back to the registration. Same value on both sheets. */
        leadId,
        firstName,
        lastName,
        phone,
        phoneCountry,
        city,
        startDate: OFFER_CONFIG.startDate,
        sessionTimes: OFFER_CONFIG.sessionTimes,
        /* Meta's parcel, opened again in the webhook. Stripe returns metadata
           verbatim on checkout.session.completed, which is what makes this
           work without a database. */
        capiEventId,
        fbp,
        fbc,
        clientIp,
        clientUserAgent,
        eventSourceUrl,
        /* ── attribution, for the VIP CRM row ─────────────────────── */
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
        description: `5-Day Pain Reset VIP (${vip.priceLabel}): ${firstName} ${lastName}`.trim(),
        /* Copied onto the PaymentIntent too, so a refund actioned from the
           payments screen still shows who it belongs to. */
        metadata: { funnel: OFFER_CONFIG.funnelSlug, tier: 'vip', leadId, firstName, lastName },
      },
      /* session_id lets /thank-you-vip confirm the payment server-side instead
         of trusting the redirect. */
      success_url: `${origin}${OFFER_CONFIG.thankYouVipPath}?session_id={CHECKOUT_SESSION_ID}`,
      /* Cancelling returns to the OTO, NOT to an error. Their free place is
         already held, so backing out of the upgrade is a normal thing to do
         and must not read as a failure. */
      cancel_url: `${origin}${OFFER_CONFIG.upgradePath}?cancelled=1`,
      /* Someone who wanders off should not come back to a dead session. */
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    });

    if (!session.url) {
      console.error('[checkout] Stripe returned a session with no URL', session.id);
      return Response.json(
        { error: 'Could not open the payment page. Please try again.' },
        { status: 502 },
      );
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

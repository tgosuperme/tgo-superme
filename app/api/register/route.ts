import { randomUUID } from 'node:crypto';

import { CHECKOUT_CONFIG, PLANS } from '@/lib/checkout-config';
import {
  browserContext,
  capiConfigured,
  externalIdFor,
  sendCapiEvent,
} from '@/lib/meta-capi';
import { type RegistrationPayload, sendRegistrationToPabbly } from '@/lib/pabbly';
import {
  packRegistrationCookie,
  REG_COOKIE,
  REG_COOKIE_MAX_AGE,
  signRegistration,
} from '@/lib/registration';

/**
 * The free registration. This is where the funnel's conversion now happens.
 *
 * Takes what the modal collected, writes the row to the free Pabbly workflow,
 * reports `registration_complete` to Meta, and hands back a signed token the
 * confirmation page can check. No payment, no Stripe, no redirect.
 *
 * ── THIS REQUEST IS THE HIGH-WATER MARK FOR MATCH QUALITY ─────────────────
 * It is made by the reader's own browser, moments after they typed their name,
 * email, phone and city. Everything Meta can match on exists at once, in one
 * place, for the only time in the funnel:
 *
 *     from the form      email, phone, first name, last name, city
 *     from the selector  country, via the dialling code they picked
 *     from the cookies   _fbp, and _fbc or the fbclid to rebuild it
 *     from the request   their real IP and user agent
 *
 * All of it goes on the event. That is the whole reason this replaced
 * atc_event, which fired on a CTA tap with none of it and scored accordingly.
 *
 * ── WHY THE EVENT IS SENT FROM HERE AND NOT THE BROWSER ───────────────────
 * The Pixel is blocked for a meaningful share of people, and a blocked Pixel is
 * a lost conversion. This request already reached our server carrying the
 * buyer's own IP and user agent, so the server copy is both more reliable and
 * no less well matched. There is no browser half to deduplicate against.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  firstName?: string;
  lastName?: string;
  email?: string;
  /** Already E.164 from the form. */
  phone?: string;
  phoneCountry?: string;
  city?: string;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  fbclid?: string;
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
    /* an empty body fails validation below */
  }

  const firstName = (body.firstName ?? '').trim().slice(0, 100);
  const lastName = (body.lastName ?? '').trim().slice(0, 100);
  const email = (body.email ?? '').trim().slice(0, 200);
  const phone = (body.phone ?? '').trim().slice(0, 32);
  const phoneCountry = /^[A-Za-z]{2}$/.test(body.phoneCountry ?? '')
    ? (body.phoneCountry as string).toUpperCase()
    : '';
  const city = (body.city ?? '').trim().slice(0, 100);

  /* Re-checked here, not just in the modal. The client validation is for the
     reader's benefit; this is the part that holds, because a crafted POST never
     touches the form. Kept deliberately loose — the server's job is to reject
     junk, not to second-guess a real person's name or dialling plan. */
  if (!email || !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) {
    return Response.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (firstName.length < 2) {
    return Response.json({ error: 'A first name is required.' }, { status: 400 });
  }
  if (lastName.length < 1) {
    return Response.json({ error: 'A last name is required.' }, { status: 400 });
  }
  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    return Response.json({ error: 'A valid mobile number is required.' }, { status: 400 });
  }
  if (city.length < 2) {
    return Response.json({ error: 'A city or town is required.' }, { status: 400 });
  }

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
  const fbp = (body.fbp ?? '').trim().slice(0, 255);
  const eventSourceUrl = (body.eventSourceUrl ?? '').trim().slice(0, 400);

  /* ── HYBRID fbc ───────────────────────────────────────────────────────
     Prefer the real `_fbc` cookie the Pixel wrote; rebuild it from the stored
     click id when it is absent, which is routine on iOS and inside in-app
     browsers where the Pixel may never have run.

     This is the single highest-leverage field for both match quality and for
     Meta crediting the right ad, so it is never left cookie-only. */
  const cookieFbc = (body.fbc ?? '').trim().slice(0, 255);
  const fbclidTs = Number(body.fbclidTs) > 0 ? Number(body.fbclidTs) : Date.now();
  const fbc = cookieFbc || (fbclid ? `fb.1.${fbclidTs}.${fbclid}` : '');

  /* Theirs, because this request is theirs. The Stripe webhook later cannot
     read either — that one comes from Stripe's servers. */
  const { clientIp, clientUserAgent } = browserContext(req);

  const eventId = randomUUID();
  const createdAt = new Date().toISOString();

  const row: RegistrationPayload = {
    lead_id: eventId,
    created_at: createdAt,

    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`.trim(),
    email,
    phone,
    city,
    country_code: phoneCountry,

    fbc,
    fbp,
    client_ip_address: clientIp,
    client_user_agent: clientUserAgent,
    external_id: externalIdFor(email),

    event_source_url: eventSourceUrl,
    registration_event_id: eventId,

    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
    utm_term: utmTerm,
    fbclid,
    gclid,
    referrer,
    landing_url: landingUrl,

    funnel: CHECKOUT_CONFIG.funnelSlug,
    offer: PLANS.seat.productName,
    plan: PLANS.seat.id,
    cohort_start_date: CHECKOUT_CONFIG.startDate,
    cohort_end_date: CHECKOUT_CONFIG.endDate,
    session_times: CHECKOUT_CONFIG.sessionTimes,
  };

  /* Logged BEFORE either hand-off, so the registration exists in the platform
     logs even if Pabbly and Meta are both unreachable. */
  console.info('[register]', JSON.stringify(row));

  /* ── the Meta event ───────────────────────────────────────────────────
     Awaited rather than fired and forgotten: a serverless function can be
     frozen the moment it returns a response, and a dangling promise would
     simply never be delivered.

     Failure is logged, never thrown. A Meta outage must not stop someone
     registering for a free challenge. */
  if (capiConfigured()) {
    try {
      await sendCapiEvent({
        eventName: CHECKOUT_CONFIG.capi.events.registrationComplete,
        eventId,
        eventTime: Math.floor(Date.now() / 1000),
        eventSourceUrl,
        user: {
          email,
          phone,
          firstName,
          lastName,
          city,
          country: phoneCountry || 'AE',
          fbp,
          fbc,
          clientIp,
          clientUserAgent,
        },
        /* No value and no currency. Nothing was charged, and sending a zero
           would teach the ad account to optimise toward a zero. */
      });
    } catch (err) {
      console.error('[register] registration_complete failed', err);
    }
  } else {
    console.warn('[register] Meta CAPI not configured, event not reported');
  }

  /* Swallows its own failure — see the note on the function. */
  await sendRegistrationToPabbly(row);

  /* The proof the confirmation page checks. Empty when no secret is set, which
     the page treats as unverified rather than as verified.

     It goes back BOTH ways on purpose: in the body for sessionStorage, which
     the OTO and the checkout read on the client, and in an httpOnly cookie,
     which is the only one of the two a Server Component can see. */
  const token = signRegistration(email);
  const res = Response.json({ ok: true, token });
  if (token) {
    res.headers.append(
      'Set-Cookie',
      [
        `${REG_COOKIE}=${encodeURIComponent(packRegistrationCookie(email, token))}`,
        'Path=/',
        `Max-Age=${REG_COOKIE_MAX_AGE}`,
        'HttpOnly',
        'SameSite=Lax',
        process.env.NODE_ENV === 'production' ? 'Secure' : '',
      ]
        .filter(Boolean)
        .join('; '),
    );
  }
  return res;
}

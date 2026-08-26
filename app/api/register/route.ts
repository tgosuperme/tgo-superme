import { randomUUID } from 'node:crypto';

import { browserContext, capiConfigured, externalIdFor, sendCapiEvent } from '@/lib/meta-capi';
import { OFFER_CONFIG } from '@/lib/offer-config';
import { pabblyConfigured, sendLeadToPabbly, type LeadPayload } from '@/lib/pabbly';

/**
 * Registers one free place on the 5-Day Pain Reset.
 *
 * This single route replaces BOTH halves of the paid build: /api/checkout,
 * which opened a Stripe Checkout Session, and /api/webhooks/stripe, which
 * fulfilled once the money moved. With nothing to pay there is no redirect out
 * to a processor and no round trip back, so the whole conversion happens in
 * one request from the reader's own browser.
 *
 * Shape of the decisions taken here, so they are not re-litigated later:
 *
 *   · The registration id is minted HERE, server-side. It is the row's
 *     canonical key, the registration_complete event id and the Pabbly dedupe
 *     key all at once, so it must not be something a client can choose.
 *   · Validation runs again on the server. The client rules are for the
 *     reader's benefit; these are the ones that actually hold, because a
 *     crafted POST never touches the form.
 *   · THE ORDER MATTERS: Meta first, then Pabbly, then the response. Meta is
 *     the one that costs money to lose (an unreported conversion is ad spend
 *     the account never learns from), and neither is allowed to fail the
 *     registration itself.
 *   · A REGISTRATION IS NEVER FAILED FOR A REPORTING PROBLEM. Both hand-offs
 *     are logged and swallowed. The reader has given their details and their
 *     place is held; telling them otherwise because a sheet was briefly
 *     unreachable would be a lie, and the row is recoverable from the log line
 *     written before either call.
 *
 * On success it sets a short-lived httpOnly cookie and returns { ok: true }.
 * The browser then sends itself to /thank-you, which reads that cookie to
 * personalise the confirmation. Nothing identifying travels in the URL.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  firstName?: string;
  lastName?: string;
  email?: string;
  /** Already E.164 from the form, e.g. "+447700900000". */
  phone?: string;
  /** ISO 3166-1 alpha-2 the reader picked, kept for segmenting later. */
  phoneCountry?: string;
  city?: string;
  /* ── Meta match keys, read from the browser by the form ────────────── */
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
  /* ── attribution, from lib/track.ts ──────────────────────────────────
     Last-touch UTM, plus the first-touch entry point. */
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

  const firstName = (body.firstName ?? '').trim().slice(0, 100);
  const lastName = (body.lastName ?? '').trim().slice(0, 100);
  const email = (body.email ?? '').trim().slice(0, 200);
  const phone = (body.phone ?? '').trim().slice(0, 30);
  /* Two letters or nothing: this only ever comes from our own selector, so
     anything else is a crafted request and is dropped rather than argued
     with. */
  const phoneCountry = /^[A-Za-z]{2}$/.test(body.phoneCountry ?? '')
    ? (body.phoneCountry as string).toUpperCase()
    : '';
  /* Capped at 100 characters: a city that long is a paste accident rather
     than a place. */
  const city = (body.city ?? '').trim().slice(0, 100);

  const fbp = (body.fbp ?? '').trim().slice(0, 255);
  const eventSourceUrl = (body.eventSourceUrl ?? '').trim().slice(0, 400);

  /* ── attribution ──────────────────────────────────────────────────────
     Every one of these is trimmed. They are audit fields, and a truncated
     audit field is a nuisance where an unbounded one is a way to write junk
     into the sheet a kilobyte at a time. */
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
     once, so the same value reaches the conversion event and the CRM row. */
  const cookieFbc = (body.fbc ?? '').trim().slice(0, 255);
  const fbclidTs = Number(body.fbclidTs) > 0 ? Number(body.fbclidTs) : Date.now();
  const fbc = cookieFbc || (fbclid ? `fb.1.${fbclidTs}.${fbclid}` : '');

  /* THIS request is the reader's own browser, so these two are genuinely
     theirs. The paid build had to capture them at checkout time and carry
     them through Stripe to reach the webhook; here they are simply read. */
  const { clientIp, clientUserAgent } = browserContext(req);

  /* Re-checked here, not just in the form. Kept deliberately looser than the
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

  /* The row's canonical key, the registration_complete event id and the
     Pabbly dedupe key — all one value, so they can never disagree. Prefixed so
     a lead id is recognisable at a glance in the sheet and in a log line. */
  const registrationId = `reg_${randomUUID()}`;
  const createdAt = new Date().toISOString();
  /* Honest rather than hard-coded: a preview deploy or a local run writing
     into the live sheet should be filterable with a plain equals. */
  const isTest = process.env.NODE_ENV !== 'production';

  const lead: LeadPayload = {
    /* ── A–Y · universal block ─────────────────────────────────────── */
    lead_id: registrationId,
    created_at: createdAt,

    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    city,
    country_code: phoneCountry,

    fbc,
    fbp,
    client_ip_address: clientIp,
    client_user_agent: clientUserAgent,
    /* Produced by the CAPI module itself, so the row and the event can never
       disagree about who this person is. */
    external_id: externalIdFor(email),

    event_source_url: eventSourceUrl,
    /* Free. Sent as a decimal string so the sheet column keeps reading as
       currency rather than flipping type the first time a free row lands. */
    amount: '0.00',
    /* String, not boolean, per the SOP: the sheet column stays text and a
       test row is filterable with a plain equals. */
    is_test: isTest ? 'true' : 'false',
    purchase_event_id: registrationId,

    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
    utm_term: utmTerm,
    fbclid,
    referrer,
    landing_url: landingUrl,

    /* ── SuperMe extras ────────────────────────────────────────────── */
    full_name: `${firstName} ${lastName}`.trim(),
    amount_minor: 0,
    currency: 'GBP',
    payment_status: 'free',
    /* Mirrors lead_id under the key the live Pabbly workflow dedupes on. */
    stripe_session_id: registrationId,
    stripe_payment_intent: '',
    paid_at: createdAt,
    live_mode: !isTest,
    gclid,

    funnel: OFFER_CONFIG.funnelSlug,
    offer: '5-Day Pain Reset Challenge (Free)',
    cohort_start_date: OFFER_CONFIG.startDate,
    session_times: OFFER_CONFIG.sessionTimes,
  };

  /* Logged before either hand-off, so the registration exists in the platform
     logs even if Meta and Pabbly both fail and no row ever appears. */
  console.info('[register] registered', JSON.stringify(lead));

  /* ── Meta Conversions API · registration_complete ─────────────────────
     THE conversion. Sent first, because a lost one is ad spend the account
     never learns from, and awaited rather than fired and forgotten: a
     serverless function can be frozen the moment it returns a response, and a
     dangling promise would simply never be delivered.

     Sent from HERE rather than the browser on purpose. This is the only place
     that always runs — a reader who registers and closes the tab never reaches
     /thank-you — and a server event cannot be stopped by an ad blocker.

     Every match key is at its freshest here: the details were typed seconds
     ago, and the IP, user agent and cookies belong to this very request. */
  if (capiConfigured()) {
    try {
      await sendCapiEvent({
        eventName: OFFER_CONFIG.capi.events.registrationComplete,
        eventId: registrationId,
        /* Seconds, not milliseconds. Meta rejects the latter. */
        eventTime: Math.floor(Date.now() / 1000),
        eventSourceUrl,
        user: {
          email,
          phone,
          firstName,
          lastName,
          city,
          /* The dialling country the reader picked, which for this funnel is
             the best country signal available. */
          country: phoneCountry || 'GB',
          fbp,
          fbc,
          clientIp,
          clientUserAgent,
        },
      });
    } catch (err) {
      /* Logged, never thrown. The place is already held. */
      console.error(
        `[register] CAPI registration_complete event failed for ${registrationId}`,
        err,
      );
    }
  } else {
    console.warn(
      `[register] Meta CAPI not configured, ${registrationId} was not reported`,
    );
  }

  /* ── Pabbly · the CRM row ─────────────────────────────────────────── */
  if (!pabblyConfigured()) {
    console.error(
      `[register] PABBLY_WEBHOOK_URL is not set, ${registrationId} did not reach the sheet`,
    );
  } else {
    try {
      await sendLeadToPabbly(lead);
    } catch (err) {
      /* Same rule as the CAPI call above, and for a stronger reason: there is
         no payment processor standing behind this route to retry it, so a
         throw here would surface to someone who has genuinely registered. The
         row is recoverable from the log line above. */
      console.error(`[register] Pabbly hand-off failed for ${registrationId}`, err);
    }
  }

  /* The confirmation cookie. httpOnly because it carries a first name and an
     email address and no script has any business reading them; sameSite lax
     so it survives the ordinary same-site navigation to /thank-you; secure
     everywhere but local http. */
  const res = Response.json({ ok: true, id: registrationId });
  const cookie = encodeURIComponent(
    JSON.stringify({ id: registrationId, firstName, email }),
  );
  res.headers.append(
    'Set-Cookie',
    [
      `${OFFER_CONFIG.registrationCookie}=${cookie}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${OFFER_CONFIG.registrationCookieMaxAge}`,
      process.env.NODE_ENV === 'production' ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; '),
  );
  return res;
}

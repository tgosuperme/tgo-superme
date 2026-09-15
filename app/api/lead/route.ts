import { randomUUID } from 'node:crypto';

import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { canonicalCheckoutUrl } from '@/lib/checkout-url';
import {
  browserContext,
  capiConfigured,
  externalIdFor,
  sendCapiEvent,
} from '@/lib/meta-capi';
import { paymentPageFor, resolveOffer } from '@/lib/offer';
import { pabblyLeadConfigured, sendLeadToPabbly, type LeadPayload } from '@/lib/pabbly';
import { chunkRefId, type Attr } from '@/lib/refid';
import { parseVariantCookie, VARIANT_COOKIE } from '@/lib/variants';

/**
 * POST /api/lead — the details form on /checkout, and the last thing that
 * happens on our own domain before Razorpay.
 *
 * ── WHY THIS ROUTE EXISTS AT ALL ────────────────────────────────────────────
 * The Payment Page is not ours. Someone who reaches it, hesitates and closes
 * the tab leaves NO trace anywhere we can see — no row, no event, no way to
 * follow up, no audience to retarget. Until this form, every one of those
 * people was invisible, and on a hosted checkout they are the majority.
 *
 * So four fields are collected here, one step earlier, and the moment they are
 * submitted this route records the person three ways:
 *
 *     abandoned_cart → Meta, with FULL match keys
 *     ic_event       → Meta, the existing checkout-intent conversion
 *     a lead row     → its own Pabbly sheet, joinable to the eventual sale
 *
 * None of it depends on the payment succeeding.
 *
 * ── IT REPLACES /go FOR ANYONE WHO COMES THROUGH THE FORM ───────────────────
 * /go still exists and still works — a direct link, an email, an old bookmark
 * — but the picker now comes here instead, and this route does everything /go
 * did plus the form. That is deliberate rather than an extra hop:
 *
 *   · ONE UUID. /go mints its own. If the form posted here and THEN bounced
 *     through /go, the lead row and the sale row would carry different ids and
 *     the two sheets could never be joined. The id is minted here, stamped
 *     into the ref_id token, and handed back by the Razorpay webhook as the
 *     sale's lead_id and purchase_event_id.
 *   · NO PII IN OUR OWN URLs. Prefilling Razorpay means putting a name, email
 *     and phone in a query string. Sending those through /go first would write
 *     them into our platform request logs on the way past. This route returns
 *     the finished URL and the browser goes straight there, so the only place
 *     that query string exists is the hop to Razorpay, which is unavoidable.
 *
 * ── THIS REQUEST IS THE BUYER'S OWN BROWSER ─────────────────────────────────
 * Which is what makes it worth so much. The IP and user agent are genuinely
 * theirs, the cookies come in the body, and the name, email and phone were
 * typed seconds ago. The Razorpay webhook has none of that — it is a request
 * from Razorpay's servers — which is the entire reason lib/refid.ts exists.
 *
 * ALWAYS RETURNS A URL IF ONE CAN BE BUILT. Meta and Pabbly failures are
 * logged and swallowed: a reporting outage must never stand between somebody
 * and a payment page.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  firstName?: string;
  lastName?: string;
  email?: string;
  /** E.164, built by the form from the dialling code plus the national number. */
  phone?: string;
  /** ISO 3166-1 alpha-2 from the country selector, e.g. "IN". */
  countryCode?: string;
  /**
   * The NATIONAL number alone, digits only, no dialling code — "7977171379".
   *
   * Sent separately rather than sliced off `phone` here, because slicing needs
   * the dialling code and that table lives in the form. One value, one owner.
   * Razorpay's phone field carries its OWN country selector, so this is the
   * only shape that prefills it correctly — see the prefill note below.
   */
  phoneNational?: string;
  product?: string;
  /* ── browser-only Meta keys, read by the form ────────────────────── */
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
  /* ── attribution, from lib/track.ts ──────────────────────────────── */
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
    utm_id?: string;
  };
  fbclid?: string;
  /** Click time in ms, for the fbc rebuild. */
  fbclidTs?: number;
  gclid?: string;
  referrer?: string;
  landingUrl?: string;
};

/** Trim, strip anything that would break a header or a query string, and cap. */
function clean(v: unknown, max: number): string {
  return String(v ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, max);
}

function cookie(header: string, name: string): string {
  const hit = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : '';
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    /* an empty body still fails validation below */
  }

  const firstName = clean(body.firstName, 100);
  const lastName = clean(body.lastName, 100);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 30);

  /* ── validation ───────────────────────────────────────────────────────
     Re-run here rather than trusted from the form. The client rules are for
     the reader's benefit; these are the ones that hold, because a crafted POST
     never touches the form. Kept deliberately loose — the server's job is to
     reject junk, not to second-guess a real name or an unusual dialling plan.

     A REJECTION HERE BLOCKS A PAYMENT, so the messages name the field. */
  if (firstName.length < 2) {
    return Response.json({ error: 'Please enter your first name.' }, { status: 400 });
  }
  if (lastName.length < 1) {
    return Response.json({ error: 'Please enter your last name.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  /* E.164 digits INCLUDING the dialling code, so the window is wider than a
     single market's: 1-3 digits of country code plus a 7-13 digit national
     number. The form validates the national part; this validates the whole
     thing, and the two must not disagree or a valid number is rejected only
     after the round trip. */
  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 8 || phoneDigits.length > 16) {
    return Response.json(
      { error: 'Please enter a valid mobile number.' },
      { status: 400 },
    );
  }

  /* Two letters or nothing. This only ever comes from our own selector, so
     anything else is a crafted request and falls back to IN rather than being
     argued with — an India funnel with an unreadable country is still India. */
  const countryCode = /^[A-Za-z]{2}$/.test(body.countryCode ?? '')
    ? (body.countryCode as string).toUpperCase()
    : 'IN';

  /* Anything unrecognised is the base product. An unreadable parameter must
     land somebody on the CHEAPER page, never the dearer one. */
  const product: 'base' | 'vip' = body.product === 'vip' ? 'vip' : 'base';

  /* Digits only, capped. Razorpay's phone field is numeric and its minLength
     is 8, so anything non-numeric here would blank the prefill entirely. */
  const phoneNational = clean(body.phoneNational, 20).replace(/\D/g, '');

  const jar = req.headers.get('cookie') ?? '';
  const { clientIp, clientUserAgent } = browserContext(req);

  const utm = body.utm ?? {};
  const utmSource = clean(utm.source, 100);
  const utmMedium = clean(utm.medium, 100);
  const utmCampaign = clean(utm.campaign, 200);
  const utmContent = clean(utm.content, 200);
  const utmTerm = clean(utm.term, 200);
  const utmId = clean(utm.utm_id, 100);
  const gclid = clean(body.gclid, 255);
  const referrer = clean(body.referrer, 400);
  const landingUrl = clean(body.landingUrl, 400);
  const fbclid = clean(body.fbclid, 255);
  const eventSourceUrl = clean(body.eventSourceUrl, 400);

  /* ── HYBRID fbc ───────────────────────────────────────────────────────
     The real `_fbc` cookie when the Pixel wrote one, otherwise rebuilt from
     the click id — the normal case on iOS and inside in-app browsers, which is
     exactly the traffic where attribution is worth most. Built ONCE here so
     the same value reaches both events, the token and every CRM row. */
  const cookieFbc = clean(body.fbc, 255) || cookie(jar, '_fbc');
  const ts = Number(body.fbclidTs) > 0 ? Number(body.fbclidTs) : Date.now();
  const fbc = cookieFbc || (fbclid ? `fb.1.${ts}.${fbclid}` : '');
  const fbp = clean(body.fbp, 255) || cookie(jar, '_fbp');

  /* ── THE ONE ID ───────────────────────────────────────────────────────
     Minted here and nowhere else. It becomes, in order: this lead row's
     lead_id, the `i` field of the ref_id token, and — once Razorpay hands the
     token back on the webhook — the sale row's lead_id and purchase_event_id.
     One value end to end is what lets the lead sheet and the sale sheet be
     joined, and what makes "filled the form, never paid" answerable. */
  const leadId = randomUUID();
  const createdAt = new Date().toISOString();
  const offer = resolveOffer();
  const variant = parseVariantCookie(cookie(jar, VARIANT_COOKIE));

  /* The price of the pass they picked. INTENDED, not paid. */
  const priceInr = product === 'vip' ? offer.vipPrice : offer.price;
  const isTest = process.env.RAZORPAY_KEY_ID?.includes('_test_') ? 'true' : 'false';

  const lead: LeadPayload = {
    lead_id: leadId,
    created_at: createdAt,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    country_code: countryCode,

    fbc,
    fbp,
    client_ip_address: clientIp,
    client_user_agent: clientUserAgent,
    /* Produced by the CAPI module itself, so the row and the event can never
       disagree about who this person is. */
    external_id: externalIdFor(email),

    event_source_url: eventSourceUrl,
    amount: priceInr.toFixed(2),
    is_test: isTest,

    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
    utm_term: utmTerm,
    fbclid,
    referrer,
    landing_url: landingUrl,

    product,
    product_name:
      product === 'vip'
        ? 'SuperMe 5-Day Pain Reset Challenge + VIP Access'
        : 'SuperMe 5-Day Pain Reset Challenge',
  };

  /* Logged before either hand-off, so the lead survives in the platform logs
     even if Meta and Pabbly both fail and no row ever appears. */
  console.info('[lead] captured', JSON.stringify(lead));

  /* ── Meta · abandoned_cart and ic_event ───────────────────────────────
     Both carry the full match set — email, phone, first and last name,
     country, external_id, plus fbp, fbc, IP and user agent — because all of it
     exists right now on this request. Expect EMQ in the 8.5-9.5 band, the same
     as `sales`, which is what makes abandoned_cart worth retargeting from
     rather than merely counting.

     NEITHER CARRIES MONEY. Nothing has been paid, and a stream of ₹497s that
     never became revenue would train value-based bidding on income that does
     not exist. `sales` remains the only event in this funnel with a value.

     Awaited, not fired and forgotten: a serverless function can be frozen the
     instant it returns, and a dangling promise is simply never delivered.
     Failures are swallowed — the buyer still gets their URL. */
  const user = {
    email,
    phone,
    firstName,
    lastName,
    country: countryCode,
    fbp: fbp || undefined,
    fbc: fbc || undefined,
    clientIp: clientIp || undefined,
    clientUserAgent: clientUserAgent || undefined,
  };
  const eventTime = Math.floor(Date.now() / 1000);

  if (capiConfigured()) {
    /* Suffixed ids off the one uuid, so both are unmistakable in Events
       Manager and neither can collide with the bare uuid that `sales` reuses
       as purchase_event_id. */
    for (const [name, id] of [
      [CHECKOUT_CONFIG.capi.events.abandonedCart, `${leadId}-ac`],
      [CHECKOUT_CONFIG.capi.events.initiateCheckout, `${leadId}-ic`],
    ] as const) {
      try {
        await sendCapiEvent({
          eventName: name,
          eventId: id,
          eventTime,
          /* Reduced to the origin inside sendCapiEvent, per the H&W rules. */
          eventSourceUrl,
          user,
        });
      } catch (err) {
        console.error(`[lead] ${name} failed for ${leadId}`, err);
      }
    }
  }

  /* ── Pabbly · the lead sheet ──────────────────────────────────────── */
  if (!pabblyLeadConfigured()) {
    console.error(
      `[lead] PABBLY_LEAD_WEBHOOK_URL is not set, ${leadId} did not reach the lead sheet`,
    );
  } else {
    try {
      await sendLeadToPabbly(lead);
    } catch (err) {
      /* Logged, never thrown. There is a person watching a spinner on the
         other end of this and no processor behind them to retry; failing the
         request would cost a sale to save a row that is already in the log
         line above. */
      console.error(`[lead] Pabbly hand-off failed for ${leadId}`, err);
    }
  }

  /* ── the Razorpay URL ─────────────────────────────────────────────────
     Resolved through canonicalCheckoutUrl because the link the dashboard
     hands out is an rzp.io shortlink, and that shortlink DROPS THE QUERY
     STRING on its 302 — which would throw away both the ref_id and the
     prefill. See lib/checkout-url.ts. */
  const attr: Attr = {
    i: leadId,
    p: fbp || undefined,
    c: fbc || undefined,
    a: clientIp || undefined,
    u: clientUserAgent || undefined,
    s: utmSource || undefined,
    m: utmMedium || undefined,
    n: utmCampaign || undefined,
    o: utmContent || undefined,
    t: utmTerm || undefined,
    d: utmId || undefined,
    r: referrer || undefined,
    l: landingUrl || undefined,
    h: clean(variant.headline, 1) || undefined,
    w: clean(variant.pain, 8) || undefined,
    g: String(offer.stepIndex),
    k: product,
  };

  const target = await canonicalCheckoutUrl(paymentPageFor(product));
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    const envVar =
      product === 'vip'
        ? 'NEXT_PUBLIC_RAZORPAY_PAGE_VIP'
        : 'NEXT_PUBLIC_RAZORPAY_PAGE_BASE';
    console.error(
      `[lead] ${envVar} is not set or is not a valid URL (got ${JSON.stringify(target)})`,
    );
    return Response.json(
      { error: 'Checkout is unavailable right now. Please try again shortly.' },
      { status: 503 },
    );
  }

  /* Razorpay rejects a `notes` value over 512 characters AT SUBMIT — it
     prefills longer than that quite happily and then blocks the payment — so
     the token is chunked across ref_id and ref_id2. Both must exist as fields
     on the Payment Page. */
  chunkRefId(attr).forEach((chunk, i) => {
    url.searchParams.set(i === 0 ? 'ref_id' : `ref_id${i + 1}`, chunk);
  });

  /* ── PREFILL ──────────────────────────────────────────────────────────
     So nobody types their details twice. Only CITY is left for the buyer.

     THE FIELD NAMES AND FORMATS ARE NOT GUESSED. Both Payment Pages publish
     their own field schema in the page HTML, under settings.udf_schema, and
     both read identically:

         first_name  string  pattern "alphabets"     required
         last_name   string  pattern "alphabets"     required
         email       string  pattern "email"         required
         phone       NUMBER  pattern "phone"         required, minLength 8
         city        string  pattern "alphabets"     required
         ref_id      string  pattern "alphanumeric"  optional
         ref_id2     string  pattern "alphanumeric"  optional

     That schema is why the values are reshaped below rather than passed
     through, and it is the same constraint that forced the token to base62:
     Razorpay validates each field against its pattern and silently drops
     anything that does not match, so a value that merely LOOKS right arrives
     empty and the buyer types it again.

       · phone is declared a NUMBER, and the page renders it with its OWN
         country selector already showing "IN +91". So the value it wants is
         the NATIONAL number alone: sending 917977171379 lands as +91
         917977171379 and the buyer has to delete the duplicated code, which
         is worse than not prefilling at all. A leading `+` would also be
         rejected outright, the field being numeric.
       · the names are "alphabets". A digit or a stray comma from a paste
         would blank the whole field, so they are stripped to letters and
         spaces here rather than gambling on what the buyer typed.
       · city is deliberately NOT sent. It is the one thing we do not ask for,
         and it is required on their side, so leaving it blank is what keeps
         the Razorpay page down to a single field.

     E.164 still goes to Meta and to the CRM row — this reshaping is for
     Razorpay's input validation alone and must not leak back into either. */
  const alphabetsOnly = (v: string) =>
    v.replace(/[^A-Za-zÀ-ÿ\s]/g, ' ').replace(/\s+/g, ' ').trim();

  url.searchParams.set('first_name', alphabetsOnly(firstName));
  url.searchParams.set('last_name', alphabetsOnly(lastName));
  url.searchParams.set('email', email);
  /* National digits, NOT the E.164 digits — Razorpay adds the country code
     itself. Falls back to the full digits only if the form somehow sent no
     national part, which is the lesser of two wrongs: a duplicated code is
     visible and fixable, an empty field is a retype. */
  url.searchParams.set('phone', phoneNational || phoneDigits);

  return Response.json({ url: url.toString(), leadId });
}

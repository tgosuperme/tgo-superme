# India funnel — Razorpay Payment Page architecture

How `atc_event`, `sales`, the GA4 events and the Pabbly CRM row keep working when
the payment step is a **hosted Razorpay Payment Page** instead of our own
`/checkout` + Stripe.

Branch: `dev-abhi-india`. Sub-domain: `india.mysuperme.com`.

---

## 1. What actually changes

With Stripe, our own `/checkout` form was the last place we controlled before
the buyer left, so it could read the browser-only Meta match keys and hand them
to Stripe as session metadata. Razorpay's Payment Page is hosted on Razorpay's
domain and has no idea our Pixel exists.

Four things exist ONLY in the buyer's browser and are the difference between a
matched conversion and a wasted one:

| Key | Where it lives | Survives the jump to Razorpay? |
|---|---|---|
| `_fbp` | our cookie | No — unless we carry it |
| `_fbc` | our cookie / `fbclid` | No — unless we carry it |
| `client_ip_address` | the request | No — Razorpay's webhook is Razorpay's server |
| `client_user_agent` | the request | No — same |

So the whole design is one question: **how do those four, plus the UTMs, get
from our landing page to our webhook handler across a payment we do not host?**

Answer: a redirect route of ours in the middle, and Razorpay custom fields as
the carrier.

---

## 2. The flow

```
1  Landing page (india.mysuperme.com)
   AttributionCapture stores last-touch UTM + first-touch referrer/landing_url
   Meta Pixel sets _fbp, and _fbc from ?fbclid

2  Buyer taps a CTA  ──▶  /go   (OUR route, server-side, ~50ms)
   ├─ reads _fbp / _fbc from the cookie header
   ├─ reads the REAL client IP + user agent off this request
   ├─ reads UTM + referrer + landing_url from the superme_attr cookie
   ├─ mints lead_id + event_id (one uuid, used by every later event)
   ├─ fires atc_event to Meta CAPI  ← real IP/UA, so it matches properly
   └─ 302 ▸ https://rzp.io/rzp/<page>?<prefilled custom fields>

3  Razorpay Payment Page
   Buyer fills name / email / phone. Our carried fields are prefilled.

4  Payment succeeds
   ├─ Razorpay webhook  payment.captured  ──▶  /api/webhooks/razorpay
   │    ├─ verify X-Razorpay-Signature (HMAC-SHA256 of the RAW body)
   │    ├─ read the carried fields back out of the payload
   │    ├─ fire `sales` to Meta CAPI  ← with the browser keys from step 2
   │    └─ POST the 38-field CRM row to Pabbly
   └─ Razorpay redirects the buyer ▸ /thank-you
```

The redirect route is what makes this work. It is the last moment we are the
server answering the buyer's own browser, so it is the only place the IP and
user agent are genuinely theirs.

---

## 3. Razorpay Payment Page configuration

### 3a. ONE custom field — `ref_id`

**Decided: a single field.** Fourteen machine-looking fields on a ₹497 checkout
is a conversion tax, and Razorpay caps field labels at 16 characters anyway,
so `Client_User_Agent` could never have existed as a label.

Add exactly **two** input fields to the page:

| Label (≤16 chars) | Prefill key | Required | Helper text |
|---|---|---|---|
| `Ref ID` | `ref_id` | no | Filled in automatically — please leave as is. |
| `City` | `city` | **yes** | — |

`City` is a real field the buyer fills. It is not clutter: city is a Meta match
key, and dropping it costs EMQ — see §6a.

**Prefill keys are lowercase in the URL.** Razorpay's docs are explicit: use
lower case for the field name in the query string, upper case only inside
values. So `?ref_id=…`, never `?Ref_ID=…`.

### 3b. What `ref_id` contains

Short keys, brotli-compressed, base64url-encoded. Short keys because JSON key
names are dead weight repeated on every sale.

```jsonc
{
  "i": "6f1c2d84-9a3e-4c88-b0f1-2e5d7a9c4f10",  // event_id + lead_id, one uuid
  "p": "fb.1.1786699000000.1234567890",          // _fbp
  "c": "fb.1.1786700000000.IwY2xjawQ…",          // _fbc, hybrid-rebuilt
  "a": "49.36.183.204",                          // real client IP, from /go
  "u": "Mozilla/5.0 (iPhone; CPU iPhone OS…",    // real user agent, from /go
  "s": "Facebook_Desktop_Feed",                  // utm_source
  "m": "App Funnels 17%2F02",                    // utm_medium
  "n": "Creators 17%2F02",                       // utm_campaign
  "o": "Test – Ad 8 - 18%2F02",                  // utm_content
  "t": "120239427294970165",                     // utm_term
  "d": "120239427175930165_v2_s-1",              // utm_id
  "r": "https://l.instagram.com/",               // referrer, first-touch
  "l": "https://india.mysuperme.com/?utm_…"      // landing_url, first-touch
}
```

`fbclid` is deliberately absent: it is already the tail of `c`, recoverable by
splitting on the third `.`. Storing it twice costs ~171 characters per sale for
nothing.

### 3b-i. RESOLVED — the field holds the full token. Path A.

Measured, then verified against the live page rather than assumed.

**Sizes** (real values, real 171-char fbclid):

| Variant | JSON | base64url | gzip+b64 | brotli+b64 |
|---|---|---|---|---|
| long keys, everything | 1337 | 1786 | 883 | 786 |
| **short keys (above)** | 1043 | 1394 | 824 | **736** |

**Verification against `pl_TS7plD5cahZ5oX`:**

- An 800-character ruler survives intact — all 80 markers present, last one
  `0800______`.
- The real 739-character token round-trips byte-identical: sent 739, found 739,
  `identical: true`, correct tail.

Where it lands: the hosted page is a client-rendered SPA with **zero `<input>`
tags in the server HTML**. The prefill arrives as a `requestParams` object
inside the page bootstrap:

```js
var requestParams = {"ref_id":"v1.GxQEICwO7MbOG…"}
```

The app reads that object and populates the fields. So there is no server-side
length ceiling at 800, and nothing truncates.

**Consequence: no KV, no Redis, no Blob, no Vercel Pro.** One `ref_id` field
carries the whole payload inline. §10's decision tree resolves to the top row.

**Use the canonical URL in `/go`, not the `rzp.io` shortlink.** The redirect
`rzp.io/rzp/gmoTfXX → pages.razorpay.com/pl_TS7plD5cahZ5oX/view` is not
guaranteed to preserve query parameters, and an attribution blob silently
dropped by a redirect is the kind of failure nobody notices for a month:

```
https://pages.razorpay.com/pl_TS7plD5cahZ5oX/view?ref_id=<token>
```

**Still unverified:** whether the value reaches the WEBHOOK. Being in the page
is not the same as being in the payload. That is what the ₹1 payment settles —
see §6.

### 3c. Webhook

Dashboard ▸ Settings ▸ Webhooks ▸ Add New Webhook.

- **URL** — `https://india.mysuperme.com/api/webhooks/razorpay`
- **Secret** — generate one, store as `RAZORPAY_WEBHOOK_SECRET`
- **Active event** — `payment.captured`

`payment.captured` is the one to use. `payment.authorized` fires before the money
is actually captured, and `order.paid` does not exist for every Payment Page
configuration. Subscribe to **one** event only, or the handler runs twice per sale.

Signature verification is `HMAC-SHA256(raw_body, secret)` compared against the
`X-Razorpay-Signature` header — against the **raw** body, exactly like Stripe.
Parsing the JSON first changes the bytes and every signature fails.

---

## 4. What fires, and from where

| Event | System | Fired from | Notes |
|---|---|---|---|
| `PageView` | Meta Pixel | browser | the only browser event, unchanged |
| `atc_event` | Meta CAPI | `/go`, server | real IP/UA, `_fbp`/`_fbc` from cookies |
| `sales` | Meta CAPI | Razorpay webhook, server | browser keys carried via custom fields |
| `add_to_cart` | GA4 | browser | unchanged |
| `join_whatsapp` | GA4 | browser | unchanged |
| ~~`ic_event`~~ | — | — | dropped: there is no checkout step of ours any more |
| ~~`initiate_checkout`~~ | — | — | dropped, per instruction |

`ic_event` has nowhere to fire now. The tap that used to mean "reached our
checkout form" is the same tap that now means `atc_event`, and firing both on
one click would double-count. Flagged as a decision, not an omission — say if
you would rather `atc_event` fire on the CTA and `ic_event` fire on the redirect.

---

## 5. The Pabbly CRM row

Same 38 fields as the main branch, same names, so the sheet mapping is
identical. What changes is where each value comes from.

**Unchanged, carried through the custom fields:** `fbc`, `fbp`,
`client_ip_address`, `client_user_agent`, all five `utm_*`, `fbclid`,
`referrer`, `landing_url`, `purchase_event_id`.

**Now from the Razorpay payload:**

| Field | Source |
|---|---|
| `lead_id` | `Ref_ID` (minted by `/go`) — NOT the razorpay payment id, so it is stable across retries |
| `created_at` | `payload.payment.entity.created_at` × 1000, ISO |
| `first_name` / `last_name` | split of the Payment Page name field |
| `email` | `payload.payment.entity.email` |
| `phone` | `payload.payment.entity.contact` |
| `amount` | `entity.amount / 100` |
| `currency` | `INR` |
| `is_test` | `!entity.captured` is not it — use the key mode (`rzp_test_` vs `rzp_live_`) |
| `external_id` | `sha256(lowercase(trim(email)))`, same helper as today |
| `razorpay_payment_id` | replaces `stripe_payment_intent` |
| `razorpay_order_id` | replaces `stripe_session_id` |

**Lost unless you add a field:** `city`. Our Stripe checkout collected it; the
Razorpay page will not unless you add a City input. Recommend adding it — city
is a Meta match key and drops EMQ when absent.

---

## 6a. Does the single field cost us EMQ? No. But something else does.

**The token is transport, not data.** Meta never sees `ref_id`. Our webhook
decodes it and calls the Conversions API with exactly the same `user_data` it
would have sent under Stripe. Eleven keys, unchanged:

```
em  ph  fn  ln  ct  country  external_id  fbp  fbc  client_ip_address  client_user_agent
```

`fbp`, `fbc`, IP and user agent are the four that a hosted checkout normally
destroys, and the whole point of `/go` + `ref_id` is that they survive. So
`sales` should score the same as it does today.

**The real EMQ risk is `ct` (city), and it is not about encoding.** Our Stripe
checkout collected city on our own form. The Razorpay page will not collect it
unless you add the field — which is why §3a makes `City` a required input. Drop
it and you lose one of the eleven keys on every single sale.

Two smaller notes, both handled:

- **`fn` / `ln`** — Razorpay collects one "Full Name". The webhook splits on the
  first space: first token → `fn`, remainder → `ln`. Slightly lossy for
  multi-part names, and still far better than sending neither.
- **`country`** — no dialling-code selector on a Razorpay page, so there is no
  per-buyer country signal. Hard-code `IN`; this is an India-only funnel on an
  India-only sub-domain, so it is accurate rather than a guess.

**The 38 Pabbly fields are unaffected too.** Every value is reassembled
server-side in the webhook before the POST, so the sheet mapping built for the
main branch is byte-for-byte identical. `stripe_session_id` /
`stripe_payment_intent` become `razorpay_order_id` / `razorpay_payment_id` —
same positions, same column count.

---

## 6b. ⚠️ Leave the Razorpay "Facebook Pixel" box EMPTY

The Plugins and Add-ons dialog offers Page Views / Add to Cart / Initiate
Payment / Payment Complete. **Do not tick any of them, and do not paste the
pixel id.**

Those checkboxes fire Meta's STANDARD events — `AddToCart`, `InitiateCheckout`,
`Purchase`. This ad account deliberately optimises on three CUSTOM events
(`atc_event`, `ic_event`, `sales`) and no standard ones. Turning them on would:

- inject standard events the account does not optimise on, muddying the dataset;
- fire a browser `Purchase` alongside our server `sales` with **no shared
  event_id**, so Meta cannot deduplicate them — two conversions for one sale;
- set `_fbp` on `rzp.io`, a domain we do not own, which does nothing for us.

**Google Analytics is different — keep it.** `G-EKT4VPX6PV` in that box is
useful: it gives you drop-off between our landing page and the payment page,
which is otherwise invisible. Just confirm it is the India property and not the
UK one.

---

## 6. The one thing to verify before building on it

Everything above assumes **custom field values come back in the
`payment.captured` webhook payload** (expected under
`payload.payment.entity.notes`).

Razorpay's public docs confirm prefill-by-query-param and confirm Payment Pages
support webhooks, but I could not find a page that states the custom-field →
`notes` mapping explicitly. **Do not build on it untested.** Ten-minute check:

1. Create the Payment Page with two custom fields, ₹1, live mode.
2. Point the webhook at a throwaway listener (`webhook.site`) on `payment.captured`.
3. Open the page with `?Ref_ID=TEST123&FBP=TEST456` prefilled.
4. Pay ₹1.
5. Look at what the listener received and find where `TEST123` landed.

If it is in `notes` — everything above works as written.
If it is absent, the fallback is a **Payment Pages API lookup** in the webhook
handler: take the payment id, fetch the payment page record server-side, read
the field responses from there. One extra API call per sale, same end result.

Send me that captured payload and I will write the handler against the real shape.

---

## 7. Two problems worth deciding on now

**a. Field visibility — RESOLVED.** Collapsed to one `ref_id` field, see §3a.
Only `Ref ID` and `City` are on the page; `Ref ID` is not required and carries
"Filled in automatically — please leave as is."

**b. `utm_id` is still dropped by the capture layer.** Your ad URL carries
`utm_id=120239427175930165_v2_s-1` — the Meta campaign id, the single most useful
field for joining CRM rows to Ads Manager — and `lib/track.ts` does not capture
it. Same fix as flagged on the main branch, still one small commit.

---

## 8. Env vars for this branch

```
RAZORPAY_KEY_ID=rzp_live_…
RAZORPAY_KEY_SECRET=…                  # server only, for the API fallback in §6
RAZORPAY_WEBHOOK_SECRET=…              # from the webhook you create
NEXT_PUBLIC_RAZORPAY_PAGE_URL=https://rzp.io/rzp/…
NEXT_PUBLIC_META_PIXEL_ID=…            # new India pixel
META_PIXEL_ID=…                        # same value, server side
META_CAPI_ACCESS_TOKEN=…               # new India token
NEXT_PUBLIC_GA_MEASUREMENT_ID=…        # new India property
NEXT_PUBLIC_CLARITY_PROJECT_ID=…       # new India project
NEXT_PUBLIC_SITE_URL=https://india.mysuperme.com
PABBLY_WEBHOOK_URL=…
```

Stripe's three keys are no longer read once the Razorpay handler replaces the
Stripe one. Leave them set until the cutover is done.

---

# 9. Copy for the Razorpay Payment Page

The merchant name on that page renders as **trainergoesonline.com**, and the
buyer has just spent five minutes on a page branded SuperMe. Every block below
does the partnership job in the first line so nobody wonders whether they are in
the right place.

### Page title

```
SuperMe 5-Day Pain Reset Challenge — presented with TrainerGoesOnline
```

### Page description

```
You are booking the SuperMe 5-Day Pain Reset Challenge, led by Atul Mishra
(E-RYT 500).

Payments for this challenge are handled by TrainerGoesOnline, SuperMe's
delivery partner for India — so TrainerGoesOnline is the name you will see on
this page, on your card statement and on your receipt. You are in the right
place.

WHAT YOU GET
• 5 live, coach-led sessions on Zoom
• Two timings every day — 7 AM and 7 PM IST — attend whichever suits you
• A recording of every session, shared afterwards
• Real-time form correction from Atul
• 4 instant-access guides: Back Pain Relief, Neck & Shoulder Relief,
  Knee Support, and the Unload Breath
• WhatsApp community with daily reminders and your Zoom links

Starts 18th August. 100% Money Back Guarantee.
```

### Amount field label

```
5-Day Pain Reset Challenge (₹497)
```

### Standard field labels

```
Full Name        →  Your full name (as you would like to be greeted)
Email            →  Email — your Zoom links and guides are sent here
Phone            →  WhatsApp number — for session reminders and the community
```

### Helper text on every carried field

```
Filled in automatically — please leave as is.
```

### Terms and conditions block

```
SuperMe 5-Day Pain Reset Challenge, delivered in partnership with
TrainerGoesOnline.

• Your payment is collected by TrainerGoesOnline on behalf of SuperMe.
  TrainerGoesOnline will appear on your statement and receipt.
• 100% Money Back Guarantee. Come to Day One, and if it is not for you, tell
  us by the end of that day.
• Sessions run live twice daily at 7 AM and 7 PM IST. A recording of each
  session is shared with you afterwards.
• Your Zoom links and joining instructions arrive by email and in the WhatsApp
  community. Please use an email address you check.
• This is a yoga and movement education programme. It is not medical care and
  is not a substitute for it. Please speak to your doctor before starting if
  you have not been cleared to exercise.
```

### Contact block

```
Questions before you pay?
support@trainergoesonline.com  ·  +91 97029 99936
SuperMe × TrainerGoesOnline
```

### Pay button

```
Pay ₹497 & Reserve My Place
```

### Receipt / post-payment note

```
You are in. Your place on the SuperMe 5-Day Pain Reset Challenge is confirmed.

Your Zoom links, the four guides and the WhatsApp community invite are on
their way to your email. Please check promotions and spam if you do not see it
within ten minutes.

Billed by TrainerGoesOnline, SuperMe's delivery partner for India.

See you on 18th August.
```

### Redirect after payment

```
https://india.mysuperme.com/thank-you
```

Note: unlike Stripe there is no `session_id` to re-verify against, so
`/thank-you` will need either the `razorpay_payment_id` on the redirect plus an
API lookup, or the honour-system version. Worth deciding before cutover — the
current page refuses to show joining instructions without proof of payment, and
that guard should not be quietly dropped.

---

# 10. Do we actually need Vercel KV?

**No — and the billing email you got is about a different product.** That alert
is **Vercel Blob** (file storage), which is unrelated to a key-value store. Worth
finding out what is using Blob on that account, separately from this.

The store is only needed **if the field-length test fails**. Decision tree:

| Test result | What to do | New infrastructure |
|---|---|---|
| **≥ 739 chars survive** | One `ref_id` field, token inline | **none** |
| **~250–738 survive** | Split across `Ref 1` / `Ref 2` / `Ref 3`, webhook concatenates | **none** |
| **< 250 survive** | Short pointer + a store | one KV/DB |

The middle row is the one people forget. Three fields is not fourteen — it is
still tidy, still one "leave as is" note, and costs nothing. Only if Razorpay
caps hard (say 100 characters) does a store become unavoidable.

If it does, the options, cheapest first:

1. **Upstash Redis, direct** — 10,000 commands/day free, no card. One sale is
   one write + one read, so this is free at any volume this funnel will see.
   Not billed by Vercel at all.
2. **Supabase or Neon Postgres** — free tier, a two-column table, and you get a
   permanent audit trail of every attribution blob as a side effect.
3. **Vercel Marketplace ▸ Upstash for Redis** — Vercel's own first-party KV was
   SUNSET in December 2024 and every store was migrated to Upstash. So "Vercel
   KV" and "Upstash" are now the same product; the Marketplace version just
   gives unified billing and provisioning inside the Vercel dashboard. If the
   objection is vendor sprawl rather than Upstash itself, this is the answer.

**Not Vercel Blob.** Blob is object storage for files. It would technically work
— write a small JSON per sale, read it back — but it is billed on *data
transfer*, which is the exact quota already at 75%, it has no TTL so blobs
accumulate forever unless explicitly deleted, and an HTTP object fetch on the
webhook's critical path is slower than a KV read for no benefit.

Nothing about the choice affects EMQ or the Pabbly row. It is transport.

---

# 11. `/go` — exact behaviour

New route, `app/go/route.ts`. Every CTA on the site points at `/go` instead of
`/checkout`. It is a server route that redirects; nothing renders.

```
GET /go
 │
 1. READ COOKIES  (these arrive because they are OUR domain's cookies)
 │     _fbp            → the Pixel's browser cookie
 │     _fbc            → the click id, if the Pixel wrote one
 │     superme_attr    → last-touch UTM + first-touch referrer/landing_url + ts
 │
 │   ← this is why lib/track.ts mirrors attribution to a COOKIE and not just
 │     localStorage. A server route cannot read localStorage. That mirror,
 │     added for ITP resilience, is what makes this whole design possible.
 │
 2. READ HEADERS
 │     x-forwarded-for → first entry = the buyer's REAL ip
 │     user-agent      → the buyer's REAL user agent
 │
 │   ← the only moment these are genuinely the buyer's. The Razorpay webhook
 │     is a request from Razorpay's servers and has neither.
 │
 3. REBUILD fbc (hybrid)
 │     _fbc cookie, else `fb.1.${attr.ts}.${attr.fbclid}`
 │
 4. MINT ONE ID
 │     eventId = randomUUID()   → becomes event_id AND lead_id AND purchase_event_id
 │
 5. FIRE atc_event → Meta CAPI      (awaited, not fire-and-forget:
 │                                   a serverless function can freeze the
 │                                   instant it returns a response, and a
 │                                   dangling promise is simply never sent)
 │
 6. BUILD ref_id
 │     JSON(short keys) → brotli → base64url → "v1." + token
 │
 7. 302 → https://rzp.io/rzp/gmoTfXX?ref_id=<token>
```

Rules that are not optional:

- **Never block the redirect on tracking.** Wrap step 5 in try/catch. A Meta
  outage must send the buyer to the payment page anyway.
- **`export const dynamic = 'force-dynamic'`**, or Next will cache the redirect
  and every buyer gets the first buyer's `ref_id`.
- **Cap every value before encoding** and strip newlines, so one absurd UA
  cannot produce a URL Razorpay rejects.
- **302, not 307.** This is a GET, and 302 is what browsers and crawlers expect
  from a redirect endpoint.

## 11a. What the webhook does

`app/api/webhooks/razorpay/route.ts`, subscribed to `payment.captured` only.

```
POST /api/webhooks/razorpay
 │
 1. raw = await req.text()                    ← RAW, never req.json()
 2. verify HMAC-SHA256(raw, RAZORPAY_WEBHOOK_SECRET)
 │      === header  x-razorpay-signature      ← else 400
 3. parse; ignore anything that is not payment.captured
 │
 4. e = payload.payment.entity
 │      e.id            → razorpay_payment_id
 │      e.order_id      → razorpay_order_id
 │      e.amount        → /100 → amount
 │      e.email         → email
 │      e.contact       → phone
 │      e.notes         → { ref_id, city, ... }   ← §6 verifies this shape
 │
 5. decode e.notes.ref_id → the blob from step 6 of /go
 │      MISSING OR CORRUPT? Carry on anyway with what Razorpay gave us.
 │      A lower-EMQ conversion beats a dropped one, and someone who opened
 │      the payment link directly has no attribution to recover.
 │
 6. FIRE `sales` → Meta CAPI
 │      event_id = blob.i    ← the SAME id /go minted, so a retry dedupes
 │      user_data = em ph fn ln ct country external_id fbp fbc ip ua
 │
 7. POST the 38-field row → Pabbly
 │
 8. 200
```

**Order matters.** CAPI before Pabbly, and CAPI failures are logged not thrown —
exactly as the Stripe handler does today. A thrown error makes Razorpay retry
the whole handler, which would re-POST the sale to Pabbly and duplicate the row.

**Idempotency.** Razorpay retries failed webhooks. `razorpay_payment_id` is the
dedupe key for the Pabbly workflow, replacing `stripe_session_id`. Same rule as
before: look the row up before appending.

## 11b. Name and city — RESOLVED, better than planned

The live page (`pl_TS7pID5cahZ5oX`) collects **First Name and Last Name as two
separate fields**, plus City. So there is no name splitting to do and nothing
lossy about multi-part names: `fn`, `ln` and `ct` all arrive clean and map
straight into the CAPI `user_data` and the Pabbly row.

Live page field list, confirmed:

    Amount · First Name · Last Name · Email · Phone · City · ref_id

That is every `user_data` key we need except `country`, which is hard-coded
`IN`, and the four browser keys, which `ref_id` carries.

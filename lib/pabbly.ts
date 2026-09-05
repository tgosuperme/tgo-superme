/**
 * Pabbly Connect hand-off for the 5-Day Pain Reset.
 *
 * ── TWO WEBHOOKS, TWO SHEETS ────────────────────────────────────────────────
 *   PABBLY_WEBHOOK_URL      every registration, free or not, POSTed the moment
 *                           the form is submitted        → sendLeadToPabbly()
 *   PABBLY_VIP_WEBHOOK_URL  VIP upgrades only, POSTed from the Stripe webhook
 *                           once the money has cleared   → sendVipToPabbly()
 *
 * SOMEONE WHO BUYS VIP APPEARS IN BOTH. That is intended, not a duplicate: the
 * first row records that they registered, the second that they paid, and both
 * carry `lead_id` so the two join. Free-tier people appear only in the first.
 *
 * BOTH PAYLOADS CARRY THE FULL ATTRIBUTION SET — utm_*, fbclid, gclid,
 * referrer, landing_url, fbc, fbp, IP, user agent. The VIP sheet is not a
 * stripped payment receipt; it has to answer "which ad produced this sale?"
 * on its own, without a lookup back into the registrations sheet.
 *
 * That is harder than it sounds for the VIP row, and is the reason
 * /api/checkout stuffs all of it into the Stripe Checkout Session's metadata:
 * the webhook that eventually fires is a request from STRIPE's servers, with
 * none of the buyer's cookies, IP or user agent of its own. Reading any of it
 * there would describe a Stripe datacentre. See app/api/checkout/route.ts.
 *
 * Two things this file takes a position on:
 *
 *   · FLAT, snake_case payload. Pabbly's field picker maps a flat object onto
 *     sheet columns one to one; nested objects have to be unpacked by hand in
 *     the workflow and quietly break when the shape changes.
 *   · THE DEDUPE KEY DIFFERS BY SHEET, because the retry behaviour does:
 *       registrations — dedupe on `lead_id`. A double submit or a retried POST
 *                       can repeat it.
 *       VIP           — dedupe on `stripe_session_id`, which is the real
 *                       Stripe session. Stripe retries a failed webhook for up
 *                       to three days and each retry re-runs the handler.
 *     Losing a row is far worse than writing one twice, so the retries stay
 *     and the dedupe belongs on the Pabbly side.
 */

/**
 * The CRM row.
 *
 * The first 25 fields are the UNIVERSAL block from META_CAPI_SOP §4 — the same
 * for every funnel we run — and become columns A–Y of the sheet. They carry
 * every identifier the downstream Apps Script needs to fire high-EMQ
 * LeadShowUp / QualifiedLead / HighTicketPurchase events later, which is the
 * whole reason they are here: a lifecycle event fired weeks after registration
 * has no cookies, no IP and no user agent of its own, so it can only reuse
 * what was captured at registration time and parked in this row.
 *
 * Everything after them is SuperMe-specific and sits to the right of the
 * lifecycle columns, so the universal block keeps its A–Y positions.
 *
 * EVERY field is always present, `''` rather than undefined, so Pabbly's field
 * mapping is stable. A key that disappears when empty silently unmaps the
 * column and every later row shifts.
 */
export type LeadPayload = {
  /* ── A–Y · universal block (SOP §4) ──────────────────────────────── */
  /* identity of the row */
  lead_id: string; // A · the registration id. SAME on the free and VIP rows.
  created_at: string; // B · ISO 8601, UTC

  /* who */
  first_name: string; // C
  last_name: string; // D
  email: string; // E · raw; hashing happens at CAPI time
  phone: string; // F · E.164, e.g. +447700900123
  city: string; // G
  country_code: string; // H · ISO 3166-1 alpha-2

  /* Meta match keys. Captured in the reader's browser AT REGISTRATION TIME and
     carried forward unchanged onto the VIP row, so both describe the same
     person and the same ad click. NEVER hashed here. */
  fbc: string; // I · hybrid: cookie, else fb.1.<ts>.<fbclid>
  fbp: string; // J
  client_ip_address: string; // K
  client_user_agent: string; // L
  external_id: string; // M · sha256(lowercase(trim(email)))

  /* the conversion */
  event_source_url: string; // N
  amount: string; // O · "0.00" on a free row, "4.99" on a VIP row
  is_test: string; // P · "true" / "false"
  purchase_event_id: string; // Q · the event_id the matching CAPI event used

  /* attribution — the CRM's source of truth, NOT Meta's. Meta attributes on
     fbc/fbp, never on these. Present and identical on BOTH rows. */
  utm_source: string; // R
  utm_medium: string; // S
  utm_campaign: string; // T
  utm_content: string; // U
  utm_term: string; // V
  fbclid: string; // W · backup for the fbc rebuild
  referrer: string; // X · first-touch, classifies untagged leads
  landing_url: string; // Y · first-touch entry point

  /* ── AM onward · SuperMe extras, right of the lifecycle block ─────── */
  full_name: string;
  /** "free" or "vip". The one field that says which sheet this belongs in. */
  tier: string;
  amount_minor: number; // 0 on a free row, 499 on a VIP row
  currency: string; // "GBP" on both, so the column keeps one type
  payment_status: string; // "free" or Stripe's own status, e.g. "paid"
  /** Free row: = lead_id. VIP row: the real Stripe Checkout Session id. */
  stripe_session_id: string;
  /** Free row: "". VIP row: the PaymentIntent id. */
  stripe_payment_intent: string;
  paid_at: string; // free: = created_at. VIP: when Stripe took the money.
  live_mode: boolean; // inverse of is_test, as a real boolean
  gclid: string;
  funnel: string;
  offer: string;
  cohort_start_date: string;
  session_times: string;
};

export function pabblyConfigured(): boolean {
  return Boolean(process.env.PABBLY_WEBHOOK_URL);
}

export function pabblyVipConfigured(): boolean {
  return Boolean(process.env.PABBLY_VIP_WEBHOOK_URL);
}

/**
 * POSTs one row to one Pabbly workflow, with a small retry.
 *
 * Shared by both senders so the retry, timeout and 4xx handling cannot drift
 * between the free and VIP paths — which is exactly the kind of divergence
 * that goes unnoticed until the less-travelled path is the one that fails.
 */
async function postToPabbly(
  url: string,
  payload: LeadPayload,
  label: string,
): Promise<void> {
  const attempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        /* A hanging Pabbly must not hold the caller open until the platform
           kills it, because a killed handler is an unclear failure — and on
           the registration path there is a reader sat waiting on it. */
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      });

      if (res.ok) {
        console.info(`[pabbly:${label}] sent ${payload.lead_id} (attempt ${attempt})`);
        return;
      }

      /* A 4xx is a broken or deleted workflow URL. Retrying cannot fix it and
         only keeps the caller waiting, so it fails out now. */
      const body = await res.text().catch(() => '');
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`Pabbly rejected the row: ${res.status} ${body.slice(0, 200)}`);
      }
      lastError = new Error(`Pabbly returned ${res.status} ${body.slice(0, 200)}`);
    } catch (err) {
      lastError = err;
      if (err instanceof Error && err.message.startsWith('Pabbly rejected')) throw err;
    }

    if (attempt < attempts) {
      await new Promise((resolve) => {
        setTimeout(resolve, attempt * 600);
      });
    }
  }

  throw new Error(
    `Pabbly [${label}] failed after ${attempts} attempts for ${payload.lead_id}: ${String(lastError)}`,
  );
}

/**
 * Every registration, free or about to become VIP.
 *
 * Throws when every attempt fails. The caller LOGS that and still returns
 * success to the browser: there is no payment processor standing behind
 * /api/register to retry it, and failing the response would tell someone who
 * has genuinely registered that they have not. The row is recoverable from the
 * log line the caller writes before calling this.
 */
export async function sendLeadToPabbly(payload: LeadPayload): Promise<void> {
  const url = process.env.PABBLY_WEBHOOK_URL;
  if (!url) throw new Error('PABBLY_WEBHOOK_URL is not set');
  return postToPabbly(url, payload, 'lead');
}

/**
 * VIP upgrades only, called from the Stripe webhook once payment has cleared.
 *
 * Throws on failure, and here that IS allowed to propagate: the caller turns
 * it into a 500 so Stripe retries the event later, rather than a paid upgrade
 * silently never reaching the sheet. That is safe precisely because this sheet
 * is append-and-dedupe on stripe_session_id — see the note at the top.
 */
export async function sendVipToPabbly(payload: LeadPayload): Promise<void> {
  const url = process.env.PABBLY_VIP_WEBHOOK_URL;
  if (!url) throw new Error('PABBLY_VIP_WEBHOOK_URL is not set');
  return postToPabbly(url, payload, 'vip');
}

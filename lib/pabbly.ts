/**
 * Pabbly Connect hand-off for the 5-Day Pain Reset.
 *
 * One POST per paid seat, fired from the Stripe webhook, which Pabbly appends
 * to the sales sheet.
 *
 * Two things this file takes a position on:
 *
 *   · FLAT, snake_case payload. Pabbly's field picker maps a flat object onto
 *     sheet columns one to one; nested objects have to be unpacked by hand in
 *     the workflow and quietly break when the shape changes.
 *   · stripe_session_id is the DEDUPE KEY. Stripe retries a failed webhook for
 *     up to three days, and each retry re-runs this, so the sheet can receive
 *     the same sale twice. The Pabbly workflow should look the row up by this
 *     id before it appends. Losing a sale is far worse than writing one twice,
 *     so the retry behaviour stays and the dedupe belongs on the Pabbly side.
 *
 *     PABBLY_WEBHOOK_URL=https://connect.pabbly.com/workflow/sendwebhookdata/...
 */

/**
 * The CRM row.
 *
 * The first 25 fields are the UNIVERSAL block from META_CAPI_SOP §4 — the same
 * for every funnel we run — and become columns A–Y of the sheet. They carry
 * every identifier the downstream Apps Script needs to fire high-EMQ
 * LeadShowUp / QualifiedLead / HighTicketPurchase events later, which is the
 * whole reason they are here: a lifecycle event fired weeks after the purchase
 * has no cookies, no IP and no user agent of its own, so it can only reuse
 * what was captured at payment time and parked in this row.
 *
 * Everything after them is SuperMe-specific and sits to the right of the
 * lifecycle columns, so the universal block keeps its A–Y positions.
 *
 * EVERY field is always present, `''` rather than undefined, so Pabbly's field
 * mapping is stable. A key that disappears when empty silently unmaps the
 * column and every later row shifts.
 */
export type SalePayload = {
  /* ── A–Y · universal block (SOP §4) ──────────────────────────────── */
  /* identity of the row */
  lead_id: string; // A · canonical unique key = Stripe session id
  created_at: string; // B · ISO 8601, UTC

  /* who */
  first_name: string; // C
  last_name: string; // D
  email: string; // E · raw; hashing happens at CAPI time
  phone: string; // F · E.164, e.g. +447700900123
  city: string; // G
  country_code: string; // H · ISO 3166-1 alpha-2

  /* Meta match keys, all captured in the buyer's browser at checkout time.
     NEVER hashed and never re-read at webhook time — this request is Stripe's,
     so reading them here would describe a Stripe datacentre. */
  fbc: string; // I · hybrid: cookie, else fb.1.<ts>.<fbclid>
  fbp: string; // J
  client_ip_address: string; // K
  client_user_agent: string; // L
  external_id: string; // M · sha256(lowercase(trim(email)))

  /* the conversion */
  event_source_url: string; // N
  amount: string; // O · decimal, e.g. "6.00", so the sheet reads as currency
  is_test: string; // P · "true" / "false"
  purchase_event_id: string; // Q · the event_id the `sales` event used

  /* attribution — the CRM's source of truth, NOT Meta's. Meta attributes on
     fbc/fbp, never on these. */
  utm_source: string; // R
  utm_medium: string; // S
  utm_campaign: string; // T
  utm_content: string; // U
  utm_term: string; // V
  fbclid: string; // W · backup for the fbc rebuild
  referrer: string; // X · first-touch, classifies untagged buyers
  landing_url: string; // Y · first-touch entry point

  /* ── AM onward · SuperMe extras, right of the lifecycle block ─────── */
  full_name: string;
  amount_minor: number; // pence, for anything that must not touch floats
  currency: string; // "GBP"
  payment_status: string;
  stripe_session_id: string; // = lead_id, kept under its own name for lookups
  stripe_payment_intent: string;
  paid_at: string; // = created_at, kept for the existing sheet mapping
  live_mode: boolean; // inverse of is_test, as a real boolean
  gclid: string;
  funnel: string;
  offer: string;
  /* ── which of the two products was bought ──────────────────────────
     `plan` is the machine value ("seat" | "vip"), so the sheet can be filtered
     and the WhatsApp automation can branch on it without string-matching a
     display name. `plan_name` and `content_name` are the human and the Meta
     labels for the same thing. All three are always present.

     A VIP buyer must be sent the recordings and the two extra guides; a seat
     buyer must not. This field is the only record of which. */
  plan: string;
  plan_name: string;
  content_name: string;
  cohort_start_date: string;
  cohort_end_date: string;
  session_times: string;
};

export function pabblyConfigured(): boolean {
  return Boolean(process.env.PABBLY_WEBHOOK_URL);
}

/**
 * Posts one sale to Pabbly, with a small retry.
 *
 * Throws when every attempt fails, which is deliberate: the caller turns that
 * into a 500 so Stripe retries the event later rather than the sale silently
 * never reaching the sheet.
 */
export async function sendSaleToPabbly(payload: SalePayload): Promise<void> {
  const url = process.env.PABBLY_WEBHOOK_URL;
  if (!url) {
    throw new Error('PABBLY_WEBHOOK_URL is not set');
  }

  const attempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        /* A hanging Pabbly must not hold the Stripe webhook open until the
           platform kills it, because a killed handler is an unclear failure. */
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      });

      if (res.ok) {
        console.info(
          `[pabbly] sale sent ${payload.stripe_session_id} (attempt ${attempt})`,
        );
        return;
      }

      /* A 4xx is a broken or deleted workflow URL. Retrying cannot fix it and
         only delays the Stripe retry that might, so it fails out now. */
      const body = await res.text().catch(() => '');
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`Pabbly rejected the sale: ${res.status} ${body.slice(0, 200)}`);
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
    `Pabbly failed after ${attempts} attempts for ${payload.stripe_session_id}: ${String(lastError)}`,
  );
}

/**
 * ── THE LEAD ROW · a second feed, an earlier moment ──────────────────────────
 *
 * Posted the instant the details form is submitted and the Stripe session
 * opens — BEFORE the buyer has paid, and whether or not they ever do.
 *
 * That is the whole reason it exists. Stripe Checkout is not our page:
 * somebody who reaches it, hesitates and closes the tab leaves no trace on our
 * side at all, and on a hosted checkout those people outnumber the buyers.
 * This row is the only record that they wanted it.
 *
 * ── A SEPARATE SHEET, ON PURPOSE ────────────────────────────────────────────
 * PABBLY_LEAD_WEBHOOK_URL, not the sales URL. A lead is not a sale, and mixing
 * the two means every count downstream has to filter first — which somebody
 * eventually forgets to do, and then a revenue figure includes people who
 * never paid.
 *
 * ── lead_id IS THE STRIPE SESSION ID ────────────────────────────────────────
 * Deliberately the same value the sale row uses as its own lead_id, so the two
 * sheets join on it with no extra plumbing: a lead with no matching sale row
 * is exactly the person who abandoned. It is available here because this runs
 * AFTER the session is created — which is also why the row is not written when
 * Stripe itself fails, since a buyer who sees an error and retries should not
 * leave two rows behind.
 *
 * Field names mirror SalePayload rather than inventing a second vocabulary, so
 * one Apps Script can read either sheet.
 */
export type LeadPayload = {
  lead_id: string; // = the Stripe Checkout Session id
  created_at: string; // ISO 8601, UTC
  first_name: string;
  last_name: string;
  email: string;
  phone: string; // E.164
  city: string;
  country_code: string; // ISO 3166-1 alpha-2

  /* Meta match keys, read from the form's OWN request — unlike the Stripe
     webhook, this one is the buyer's browser, so these are genuinely theirs. */
  fbc: string;
  fbp: string;
  client_ip_address: string;
  client_user_agent: string;
  external_id: string; // sha256(lowercase(trim(email)))

  event_source_url: string;
  /** The price of the plan they chose, decimal. INTENDED, not paid. */
  amount: string;
  is_test: string; // "true" / "false"

  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  fbclid: string;
  gclid: string;
  referrer: string;
  landing_url: string;

  /* Which pass they chose. `plan` is the machine value ("seat" | "vip") and is
     what anything downstream should branch on; `plan_name` is the same fact in
     words. Both are here rather than inferred from `amount`, which only
     separates the tiers while the prices are what they are today. */
  plan: string;
  plan_name: string;
  /** Same as lead_id, under the name the sales sheet already uses for lookups. */
  stripe_session_id: string;
};

export function pabblyLeadConfigured(): boolean {
  return Boolean(process.env.PABBLY_LEAD_WEBHOOK_URL);
}

/**
 * Posts one lead to the lead sheet.
 *
 * THROWS ON FAILURE, and the caller swallows it — the opposite of the sale
 * path, deliberately. There is a buyer waiting on this response to be sent to
 * Stripe and no processor behind them to retry. Failing the request would cost
 * a sale to save a CRM row, and the row is recoverable from the log line
 * /api/checkout writes before calling this.
 */
export async function sendLeadToPabbly(payload: LeadPayload): Promise<void> {
  const url = process.env.PABBLY_LEAD_WEBHOOK_URL;
  if (!url) throw new Error('PABBLY_LEAD_WEBHOOK_URL is not set');

  const attempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        /* Tighter than the sale's 10s: a buyer is watching a spinner here, and
           a slow Pabbly must never be why a checkout feels broken. */
        signal: AbortSignal.timeout(6000),
        cache: 'no-store',
      });

      if (res.ok) {
        console.info(`[pabbly] lead sent ${payload.lead_id} (attempt ${attempt})`);
        return;
      }

      const body = await res.text().catch(() => '');
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`Pabbly rejected the lead: ${res.status} ${body.slice(0, 200)}`);
      }
      lastError = new Error(`Pabbly returned ${res.status} ${body.slice(0, 200)}`);
    } catch (err) {
      lastError = err;
      if (err instanceof Error && err.message.startsWith('Pabbly rejected')) throw err;
    }

    if (attempt < attempts) {
      await new Promise((resolve) => {
        setTimeout(resolve, attempt * 400);
      });
    }
  }

  throw new Error(
    `Pabbly lead failed after ${attempts} attempts for ${payload.lead_id}: ${String(lastError)}`,
  );
}

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

/**
 * TWO WORKFLOWS, TWO URLS.
 *
 * A free registration and a paid VIP upgrade are different events with
 * different follow-ups — one gets the joining sequence, the other gets that
 * plus the recordings and the guides — so they go to separate Pabbly workflows
 * rather than one workflow branching on a field it might be asked to ignore.
 *
 *     PABBLY_FREE_WEBHOOK_URL   every registration, the moment the form is sent
 *     PABBLY_WEBHOOK_URL        VIP payments only, from the Stripe webhook
 *
 * A VIP buyer appears in BOTH: they registered first, then upgraded. The free
 * row is the registration and the paid row is the purchase, keyed on the same
 * email, which is what lets the sheet show the conversion rather than guess it.
 */
export function pabblyConfigured(): boolean {
  return Boolean(process.env.PABBLY_WEBHOOK_URL);
}

export function pabblyFreeConfigured(): boolean {
  return Boolean(process.env.PABBLY_FREE_WEBHOOK_URL);
}

/**
 * The free registration row.
 *
 * Deliberately the same shape as the paid one where the fields mean the same
 * thing — the universal identity and attribution block is identical — so the
 * two sheets can be joined on email without translating a single column name.
 * What is absent is everything about money, because none moved.
 */
export type RegistrationPayload = {
  lead_id: string;
  created_at: string;

  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  country_code: string;

  fbc: string;
  fbp: string;
  client_ip_address: string;
  client_user_agent: string;
  external_id: string;

  event_source_url: string;
  registration_event_id: string;

  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  fbclid: string;
  gclid: string;
  referrer: string;
  landing_url: string;

  funnel: string;
  offer: string;
  plan: string;
  cohort_start_date: string;
  cohort_end_date: string;
  session_times: string;
};

/**
 * Posts one sale to Pabbly, with a small retry.
 *
 * Throws when every attempt fails, which is deliberate: the caller turns that
 * into a 500 so Stripe retries the event later rather than the sale silently
 * never reaching the sheet.
 */
export async function sendSaleToPabbly(payload: SalePayload): Promise<void> {
  return post(process.env.PABBLY_WEBHOOK_URL, payload, payload.stripe_session_id);
}

/**
 * Posts one free registration to the free workflow.
 *
 * SWALLOWS its failure rather than throwing, which is the opposite of the paid
 * path and deliberate. A sale is retried by Stripe until it lands; a
 * registration has no retry behind it, and the person is standing in front of a
 * spinner waiting to be let through. Losing the row costs a CRM entry that is
 * recoverable from the log line; refusing the response costs the registration
 * itself. The row is logged before the attempt for exactly that reason.
 */
export async function sendRegistrationToPabbly(
  payload: RegistrationPayload,
): Promise<void> {
  try {
    await post(process.env.PABBLY_FREE_WEBHOOK_URL, payload, payload.lead_id);
  } catch (err) {
    console.error('[pabbly] registration did not reach the sheet', err);
  }
}

async function post(
  url: string | undefined,
  payload: unknown,
  id: string,
): Promise<void> {
  if (!url) {
    throw new Error('Pabbly webhook URL is not set');
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
          `[pabbly] sent ${id} (attempt ${attempt})`,
        );
        return;
      }

      /* A 4xx is a broken or deleted workflow URL. Retrying cannot fix it and
         only delays the Stripe retry that might, so it fails out now. */
      const body = await res.text().catch(() => '');
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`Pabbly rejected it: ${res.status} ${body.slice(0, 200)}`);
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
    `Pabbly failed after ${attempts} attempts for ${id}: ${String(lastError)}`,
  );
}

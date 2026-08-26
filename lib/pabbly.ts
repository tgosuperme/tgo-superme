/**
 * Pabbly Connect hand-off for the 5-Day Pain Reset.
 *
 * One POST per registration, fired from /api/register, which Pabbly appends to
 * the leads sheet.
 *
 * ── THE WIRE FORMAT IS UNCHANGED FROM THE PAID BUILD ────────────────────────
 * Every JSON KEY below is exactly the one the paid funnel sent, including the
 * two that now read oddly — `stripe_session_id` and `stripe_payment_intent`.
 * They are kept on purpose. The live Pabbly workflow maps those keys onto
 * sheet columns by name, and its dedupe step looks a row up by
 * stripe_session_id; renaming either would silently unmap a column and shift
 * every field to its right. The VALUES changed to describe a free lead — see
 * the notes on each — but the shape the workflow sees did not.
 *
 * Two things this file takes a position on:
 *
 *   · FLAT, snake_case payload. Pabbly's field picker maps a flat object onto
 *     sheet columns one to one; nested objects have to be unpacked by hand in
 *     the workflow and quietly break when the shape changes.
 *   · lead_id is the DEDUPE KEY, and it is mirrored into stripe_session_id so
 *     the existing workflow keeps deduping on the column it already knows. A
 *     double submit, a retried POST or a reader who refreshes the confirmation
 *     can all produce the same id twice. Losing a lead is far worse than
 *     writing one twice, so the retry behaviour stays and the dedupe belongs
 *     on the Pabbly side.
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
  lead_id: string; // A · canonical unique key = the registration id
  created_at: string; // B · ISO 8601, UTC

  /* who */
  first_name: string; // C
  last_name: string; // D
  email: string; // E · raw; hashing happens at CAPI time
  phone: string; // F · E.164, e.g. +447700900123
  city: string; // G
  country_code: string; // H · ISO 3166-1 alpha-2

  /* Meta match keys, all captured in the reader's browser as they submit the
     form. NEVER hashed. Unlike the paid build these are read from the SAME
     request that writes this row, so none of them can be stale. */
  fbc: string; // I · hybrid: cookie, else fb.1.<ts>.<fbclid>
  fbp: string; // J
  client_ip_address: string; // K
  client_user_agent: string; // L
  external_id: string; // M · sha256(lowercase(trim(email)))

  /* the conversion */
  event_source_url: string; // N
  amount: string; // O · always "0.00" — the challenge is free
  is_test: string; // P · "true" / "false"
  /* Q · the event_id registration_complete used. Key name kept from the paid
     build for the same reason as stripe_session_id below: the sheet column is
     mapped by name. */
  purchase_event_id: string;

  /* attribution — the CRM's source of truth, NOT Meta's. Meta attributes on
     fbc/fbp, never on these. */
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
  amount_minor: number; // always 0
  currency: string; // "GBP" — the sheet column stays typed as it always was
  payment_status: string; // always "free"
  /** = lead_id. Kept under the old key so the Pabbly dedupe step still finds it. */
  stripe_session_id: string;
  /** Always "". No payment exists to reference. */
  stripe_payment_intent: string;
  paid_at: string; // = created_at, kept for the existing sheet mapping
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

/**
 * Posts one registration to Pabbly, with a small retry.
 *
 * Throws when every attempt fails. The caller LOGS that and still returns a
 * success to the browser: unlike the paid build there is no payment processor
 * standing behind this to retry the whole handler, and failing the response
 * would tell someone who has genuinely registered that they have not. The row
 * is recoverable from the log line the caller writes before calling this.
 */
export async function sendLeadToPabbly(payload: LeadPayload): Promise<void> {
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
        /* A hanging Pabbly must not hold the registration response open until
           the platform kills it, because a killed handler is an unclear
           failure and the reader is sat waiting on it. */
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      });

      if (res.ok) {
        console.info(
          `[pabbly] lead sent ${payload.lead_id} (attempt ${attempt})`,
        );
        return;
      }

      /* A 4xx is a broken or deleted workflow URL. Retrying cannot fix it and
         only keeps the reader waiting, so it fails out now. */
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
        setTimeout(resolve, attempt * 600);
      });
    }
  }

  throw new Error(
    `Pabbly failed after ${attempts} attempts for ${payload.lead_id}: ${String(lastError)}`,
  );
}

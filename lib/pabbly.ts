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

export type SalePayload = {
  /* who */
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;

  /* what they paid */
  amount: string; // decimal, e.g. "6.00", so the sheet reads as currency
  amount_minor: number; // pence, for anything that must not touch floats
  currency: string; // "GBP"
  payment_status: string;

  /* which sale, for dedupe and for finding it in Stripe */
  stripe_session_id: string;
  stripe_payment_intent: string;
  paid_at: string; // ISO 8601, UTC
  live_mode: boolean; // false for test-key rows, so they can be filtered out

  /* which offer */
  funnel: string;
  offer: string;
  cohort_start_date: string;
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

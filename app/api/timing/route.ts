import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

/**
 * POST /api/timing — records which session slot a buyer intends to attend.
 *
 * Called once from the confirmation page, after the money. It is the only
 * thing that makes the 1-hour and 5-minute reminders sendable to the right
 * half of the cohort rather than to everyone twice a day.
 *
 * ── ALWAYS 204, EVEN ON FAILURE ─────────────────────────────────────────────
 * The caller is a buyer's confirmation page and there is nothing they can do
 * about a failure here. A non-2xx would surface as a console error on a page
 * whose entire job is reassurance, and would tempt a future maintainer into
 * showing an error state next to someone's payment confirmation.
 *
 * So every failure is logged and swallowed. Losing a timing preference costs
 * one slightly-wrong reminder; showing an error costs a support ticket from a
 * customer who now thinks their payment broke.
 *
 * ── THIS DOES NOT CREATE THE ROW ────────────────────────────────────────────
 * The CRM row is created by the Razorpay webhook, which is the only thing that
 * always runs. This is an UPDATE keyed on the payment id, and it can legitimately
 * arrive before the webhook has landed — Razorpay's redirect is often faster
 * than its webhook. The Pabbly workflow therefore has to handle "update a row
 * that does not exist yet" by queueing or re-trying, which is why the payload
 * carries the payment id rather than a row reference.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['morning', 'evening', 'both']);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { pid?: unknown; timing?: unknown };

    const pid = String(body.pid ?? '').trim().slice(0, 120);
    const timing = String(body.timing ?? '').trim();

    /* Validated against a fixed set rather than passed through. This endpoint
       is unauthenticated by necessity — the buyer has no session — so the only
       defence against it becoming a free write channel into the CRM is that
       nothing but these three words can ever reach it. */
    if (!pid || !ALLOWED.has(timing)) {
      return new Response(null, { status: 204 });
    }

    const url = process.env.PABBLY_TIMING_WEBHOOK_URL || process.env.PABBLY_WEBHOOK_URL;
    if (!url) {
      console.warn('[timing] no Pabbly URL configured, dropping', { pid, timing });
      return new Response(null, { status: 204 });
    }

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        /* `record_type` so the Pabbly workflow can route this to an update
           branch instead of appending it as a second buyer row. */
        record_type: 'timing_preference',
        funnel: CHECKOUT_CONFIG.funnelSlug,
        razorpay_payment_id: pid,
        session_timing: timing,
        recorded_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[timing] failed', err);
  }

  return new Response(null, { status: 204 });
}

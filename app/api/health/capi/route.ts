/**
 * GET /api/health/capi — is the Conversions API actually usable from THIS
 * deployment, right now?
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * A `sales` event went missing after two real payments. The Pabbly row landed,
 * so the webhook ran; the event did not, so something between capiConfigured()
 * and Meta failed. Every candidate — a missing variable, an expired token, a
 * stray test-event code, a value that differs between the file and Vercel —
 * looks identical from the outside, because the webhook logs the failure and
 * carries on by design. It must: a reporting outage cannot be allowed to make
 * Stripe retry a payment.
 *
 * So rather than reason about it again, this answers it in one request, from
 * inside the deployment that actually serves traffic.
 *
 * ── IT EXPOSES NO SECRETS ───────────────────────────────────────────────────
 * Presence booleans, lengths and the LAST FOUR characters of the token, and
 * nothing else. The last four are there for one job: telling whether the value
 * in Vercel is the same one that works locally, which is otherwise impossible
 * to check without printing a credential. Four characters of a 199-character
 * token identify it without being usable.
 *
 * ── ?probe=1 ASKS META ITSELF ───────────────────────────────────────────────
 * Presence is not validity. An expired or wrong-pixel token is present and
 * still fails, so the probe POSTs an EMPTY event batch to the real endpoint:
 *
 *     data: []  →  "(#100) param data must be non-empty"   credentials OK
 *               →  any OAuthException about tokens/permissions   they are not
 *
 * Zero events are sent either way, so the dataset cannot be polluted by
 * running this. It is behind a query flag rather than on by default so an
 * ordinary uptime check does not call Meta on every ping.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const pixelId = process.env.META_PIXEL_ID?.trim() ?? '';
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim() ?? '';
  const graphVersion = process.env.META_GRAPH_VERSION?.trim() || 'v21.0';
  const testCode = process.env.META_TEST_EVENT_CODE?.trim() ?? '';

  const report: Record<string, unknown> = {
    /* What capiConfigured() itself returns. If this is false, no event in the
       funnel is being sent at all and the rest of the report says which half
       is missing. */
    capiConfigured: Boolean(pixelId && token),
    pixelIdPresent: Boolean(pixelId),
    pixelId: pixelId || null, // not a secret; it is in the page HTML already
    tokenPresent: Boolean(token),
    tokenLength: token.length,
    tokenLastFour: token ? token.slice(-4) : null,
    graphVersion,
    /* ⚠️ Anything other than false here means every event is being filed as a
       test and excluded from optimisation — which looks exactly like "the
       event never fired". */
    testEventCodeSet: Boolean(testCode),
    pabblySalesConfigured: Boolean(process.env.PABBLY_WEBHOOK_URL),
    pabblyLeadConfigured: Boolean(process.env.PABBLY_LEAD_WEBHOOK_URL),
    stripeWebhookSecretPresent: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    nodeEnv: process.env.NODE_ENV,
  };

  if (new URL(req.url).searchParams.get('probe') === '1' && pixelId && token) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${graphVersion}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          /* Deliberately empty. Meta validates the credentials BEFORE it
             validates the batch, so the error it returns tells us which of the
             two failed without a single event being recorded. */
          body: JSON.stringify({ data: [] }),
          signal: AbortSignal.timeout(10_000),
          cache: 'no-store',
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string; code?: number; type?: string };
      };
      const message = body.error?.message ?? '';
      report.probe = {
        httpStatus: res.status,
        metaMessage: message,
        /* The one line worth reading. "param data must be non-empty" means
           Meta got past auth and only objected to the empty batch — which is
           exactly what a working credential pair looks like here. */
        credentialsAccepted: message.includes('data must be non-empty'),
      };
    } catch (err) {
      report.probe = { error: String(err) };
    }
  }

  /* no-store so a CDN cannot serve a stale answer to a question that is only
     ever asked about right now. */
  return Response.json(report, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

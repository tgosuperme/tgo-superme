/**
 * Pabbly Connect hand-off for the pre-booking details form.
 *
 * Flat keys only (Pabbly maps one level), and every key on every call, empty
 * where unknown: Pabbly builds its field mapper from the first payload it sees.
 * Never remove a key once a Pabbly step maps it; it silently blanks a column.
 */
export const pabblyReady = () => Boolean((process.env.PABBLY_WEBHOOK_URL ?? '').trim());

export type PabblyLead = {
  leadId: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Full E.164, e.g. +919876543210. */
  phone: string;
  /** "+91", kept apart from `phone` so a workflow can route on it. */
  dialCode: string;
  /** ISO-2, e.g. "in". */
  countryCode: string;
  city: string;
  fbc: string;
  fbp: string;
  clientIp: string;
  clientUserAgent: string;
  externalId: string;
  eventSourceUrl: string;
  /** The Meta registration_completed event id, so a row can be reconciled against Meta. */
  purchaseEventId: string;
  /** A real boolean: a Pabbly router reads the string "false" as true. */
  isTest: boolean;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  fbclid: string;
  referrer: string;
  landingUrl: string;
};

const s = (v: unknown) => (v == null ? '' : String(v));

export async function sendPabblyLead(p: PabblyLead): Promise<{ ok: boolean; status: number }> {
  const url = (process.env.PABBLY_WEBHOOK_URL ?? '').trim();
  if (!url) return { ok: false, status: 0 };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      /* The house key set and order (funnel-commerce.md), so this sheet maps
         like every other funnel's. A free call has no payment: amount is 0,
         and the payment fields travel empty rather than absent. */
      body: JSON.stringify({
        lead_id: s(p.leadId),
        created_at: s(p.createdAt),
        first_name: s(p.firstName),
        last_name: s(p.lastName),
        email: s(p.email),
        phone: s(p.phone),
        city: s(p.city),
        dial_code: s(p.dialCode),
        country_code: s(p.countryCode),
        type: 'lead',
        fbc: s(p.fbc),
        fbp: s(p.fbp),
        client_ip_address: s(p.clientIp),
        client_user_agent: s(p.clientUserAgent),
        external_id: s(p.externalId),
        event_source_url: s(p.eventSourceUrl),
        amount: 0,
        is_test: Boolean(p.isTest),
        purchase_event_id: s(p.purchaseEventId),
        utm_source: s(p.utmSource),
        utm_medium: s(p.utmMedium),
        utm_campaign: s(p.utmCampaign),
        utm_content: s(p.utmContent),
        utm_term: s(p.utmTerm),
        fbclid: s(p.fbclid),
        referrer: s(p.referrer),
        landing_url: s(p.landingUrl),
        event: 'lead',
        payment_id: '',
        order_id: '',
        name: `${s(p.firstName)} ${s(p.lastName)}`.trim(),
        currency: '',
        product: 'Free Pain Assessment Call',
        occupation: '',
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

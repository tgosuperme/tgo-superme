import crypto from 'crypto';

/**
 * Meta Conversions API, server side only.
 *
 * Classification hygiene (this offer is pain coaching, so assume Meta's health
 * category applies): custom_data carries NOTHING descriptive, no content_name,
 * no product string, no UTM, no fbclid, and event_source_url is cut to the
 * origin here rather than trusted from the browser. user_data stays maximal:
 * it is hashed and says nothing about the offer. Event names stay standard.
 */

/** Meta's standard events. A free call funnel has no payment, so no Purchase. */
export type StandardEvent = 'ViewContent' | 'Schedule';
export type SendableEvent = StandardEvent;

/** Which funnel step a ViewContent belongs to. Feeds the event id only, never Meta. */
export type FunnelStage = 'landing' | 'booking';

export function capiConfig() {
  return {
    pixelId: (process.env.META_PIXEL_ID ?? '').trim(),
    accessToken: (process.env.META_CAPI_ACCESS_TOKEN ?? '').trim(),
    testEventCode: (process.env.META_CAPI_TEST_EVENT_CODE ?? '').trim(),
  };
}

export function capiReady(): boolean {
  const c = capiConfig();
  return Boolean(c.pixelId && c.accessToken);
}

export function originOnly(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashEmail(v: string) {
  const s = v.trim().toLowerCase();
  return s ? sha256Hex(s) : undefined;
}
function hashPhone(v: string) {
  const s = v.replace(/\D/g, '');
  return s ? sha256Hex(s) : undefined;
}
function hashName(v: string) {
  const s = v.trim().toLowerCase();
  return s ? sha256Hex(s) : undefined;
}
function hashCountry(v: string) {
  const s = v.trim().toLowerCase();
  return s ? sha256Hex(s) : undefined;
}

export type UserSignals = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  externalId?: string;
  fbc?: string;
  fbp?: string;
  clientIp?: string;
  clientUserAgent?: string;
};

function buildUserData(u: UserSignals) {
  const em = u.email ? hashEmail(u.email) : undefined;
  const ph = u.phone ? hashPhone(u.phone) : undefined;
  const fn = u.firstName ? hashName(u.firstName) : undefined;
  const ln = u.lastName ? hashName(u.lastName) : undefined;
  const country = u.country ? hashCountry(u.country) : undefined;
  return {
    ...(em && { em: [em] }),
    ...(ph && { ph: [ph] }),
    ...(fn && { fn: [fn] }),
    ...(ln && { ln: [ln] }),
    ...(country && { country: [country] }),
    ...(u.externalId && { external_id: [sha256Hex(u.externalId)] }),
    ...(u.fbc && { fbc: u.fbc }),
    ...(u.fbp && { fbp: u.fbp }),
    ...(u.clientIp && { client_ip_address: u.clientIp }),
    ...(u.clientUserAgent && { client_user_agent: u.clientUserAgent }),
  };
}

/** Never throws: a failed analytics call must not fail a page. */
export async function sendCapiEvent(params: {
  eventName: SendableEvent;
  eventId: string;
  eventSourceUrl: string;
  user: UserSignals;
}): Promise<{ ok: boolean; status: number; body: unknown }> {
  const { pixelId, accessToken, testEventCode } = capiConfig();
  if (!pixelId || !accessToken) return { ok: false, status: 0, body: 'capi-not-configured' };

  const body = {
    data: [
      {
        event_name: params.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        event_source_url: originOnly(params.eventSourceUrl),
        action_source: 'website',
        user_data: buildUserData(params.user),
      },
    ],
    ...(testEventCode && { test_event_code: testEventCode }),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      },
    );
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
  } catch (e) {
    return { ok: false, status: 0, body: String(e) };
  }
}

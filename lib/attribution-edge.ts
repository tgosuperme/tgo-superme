/**
 * Attribution, the SERVER-SAFE half. No 'use client' here, ever: middleware
 * and API routes import this file, and a client module imported server-side
 * throws when called. lib/attribution.ts (browser) imports from here, never
 * the reverse.
 */

export const KEY = 'sm_attr';

export type Attribution = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  fbclid: string;
  referrer: string;
  landingUrl: string;
};

export const EMPTY: Attribution = {
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmContent: '',
  utmTerm: '',
  fbclid: '',
  referrer: '',
  landingUrl: '',
};

export const CAP = {
  utm: 100,
  fbclid: 200,
  referrer: 200,
  landingUrl: 300,
} as const;

export const cut = (v: string | null | undefined, max: number) => (v ?? '').slice(0, max);

export const ATTR_COOKIE = KEY;
export const ATTR_TTL_SECONDS = 30 * 24 * 60 * 60;

const URL_TO_KEY: Record<string, keyof Attribution> = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_content: 'utmContent',
  utm_term: 'utmTerm',
  fbclid: 'fbclid',
};

const filled = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

export function parseAttributionFromUrl(search: string): Partial<Attribution> {
  const out: Partial<Attribution> = {};
  if (!search) return out;
  try {
    const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    for (const [param, key] of Object.entries(URL_TO_KEY)) {
      const v = sp.get(param);
      if (filled(v)) out[key] = v;
    }
  } catch {
    /* malformed query string */
  }
  return out;
}

/* Raw is tried before decoding, because decoding first would corrupt
   %-sequences that legitimately live inside a stored landing url. */
export function readAttrCookie(raw: string | undefined): Partial<Attribution> {
  if (!filled(raw)) return {};
  const attempts = [raw];
  try {
    attempts.push(decodeURIComponent(raw));
  } catch {
    /* malformed escape */
  }
  for (const s of attempts) {
    try {
      const parsed = JSON.parse(s) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Partial<Attribution>;
      }
    } catch {
      /* try the next form */
    }
  }
  return {};
}

/* Context (landingUrl, referrer) is first-touch; campaign (utm*, fbclid) is
   last paid touch. A visit with no campaign never blanks a stored one. */
export function mergeAttribution(
  stored: Partial<Attribution>,
  opts: { live: Partial<Attribution>; landingUrl: string; referrer: string },
): { attr: Partial<Attribution>; changed: boolean } {
  const attr: Partial<Attribution> = { ...stored };
  let changed = false;

  if (!filled(attr.landingUrl) && filled(opts.landingUrl)) {
    attr.landingUrl = cut(opts.landingUrl, CAP.landingUrl);
    attr.referrer = filled(opts.referrer) ? cut(opts.referrer, CAP.referrer) : '';
    changed = true;
  }

  const live = opts.live;
  const hasCampaign =
    filled(live.utmSource) ||
    filled(live.utmMedium) ||
    filled(live.utmCampaign) ||
    filled(live.utmContent) ||
    filled(live.utmTerm) ||
    filled(live.fbclid);

  if (hasCampaign) {
    attr.utmSource = cut(live.utmSource ?? '', CAP.utm);
    attr.utmMedium = cut(live.utmMedium ?? '', CAP.utm);
    attr.utmCampaign = cut(live.utmCampaign ?? '', CAP.utm);
    attr.utmContent = cut(live.utmContent ?? '', CAP.utm);
    attr.utmTerm = cut(live.utmTerm ?? '', CAP.utm);
    if (filled(live.fbclid)) attr.fbclid = cut(live.fbclid, CAP.fbclid);
    changed = true;
  }

  return { attr, changed };
}

'use client';

import {
  ATTR_COOKIE,
  CAP,
  EMPTY,
  KEY,
  cut,
  readAttrCookie,
  type Attribution,
} from '@/lib/attribution-edge';

export type { Attribution };

/* Browser copy of the capture; the edge copy in middleware.ts is primary.
   A visit carrying utm_source or fbclid replaces what is stored, anything
   else leaves it alone. */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    const q = new URLSearchParams(window.location.search);
    const fbclid = q.get('fbclid') ?? '';
    const utmSource = q.get('utm_source') ?? '';

    const stored = window.localStorage.getItem(KEY);
    if (stored && !utmSource && !fbclid) return;

    const next: Attribution = {
      utmSource: cut(utmSource, CAP.utm),
      utmMedium: cut(q.get('utm_medium'), CAP.utm),
      utmCampaign: cut(q.get('utm_campaign'), CAP.utm),
      utmContent: cut(q.get('utm_content'), CAP.utm),
      utmTerm: cut(q.get('utm_term'), CAP.utm),
      fbclid: cut(fbclid, CAP.fbclid),
      referrer: isExternal(document.referrer) ? cut(document.referrer, CAP.referrer) : '',
      landingUrl: cut(window.location.href, CAP.landingUrl),
    };
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage disabled */
  }
}

function isExternal(ref: string): boolean {
  if (!ref) return false;
  try {
    return new URL(ref).host !== window.location.host;
  } catch {
    return false;
  }
}

function readCookieAttr(): Partial<Attribution> {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${ATTR_COOKIE}=([^;]+)`));
    return m ? readAttrCookie(m[1]) : {};
  } catch {
    return {};
  }
}

/* localStorage first, the edge cookie as the fallback for browsers that
   restrict storage. */
export function readAttribution(): Attribution {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<Attribution>) };
  } catch {
    /* fall through to the cookie */
  }
  return { ...EMPTY, ...readCookieAttr() };
}

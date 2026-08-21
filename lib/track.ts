/**
 * Attribution capture, per META_CAPI_SOP_VSL §4.5.
 *
 * This is the layer the Pabbly payload can only forward what it captured from.
 * Without it, utm_* / fbclid / referrer / landing_url are blank on every row
 * and untagged buyers are unclassifiable.
 *
 * ── TWO STORAGE MODELS, ON PURPOSE ──────────────────────────────────────────
 *
 *   ATTRIBUTION (utm_*, fbclid, gclid, ts) is LAST-TOUCH.
 *     Any page whose URL carries fresh attribution OVERWRITES the stored set.
 *     A buyer who first arrived from a link-in-bio and later clicks the ad gets
 *     the AD credited, not the stale bio link. Internal navigation (clean URL)
 *     leaves the stored set alone.
 *
 *   CONTEXT (referrer, landing_url) is FIRST-TOUCH.
 *     The true entry point of the session, written once. This is what lets an
 *     untagged buyer still be classified by channel.
 *
 * `ts` is the CLICK TIME, kept so the server can rebuild `_fbc` as
 * `fb.1.<ts>.<fbclid>` when the cookie is missing — common on iOS and in
 * in-app browsers, and the single highest-leverage EMQ field there is.
 *
 * Mirrored to BOTH localStorage AND a first-party cookie, because each is
 * evicted in situations the other survives (ITP, in-app webviews).
 *
 * Everything is wrapped in try/catch and fails to `{}`. Attribution must never
 * be able to break a checkout.
 */

const ATTR_KEY = 'superme_attr';
const ATTR_TTL_DAYS = 30;

export type Attribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  fbclid?: string;
  gclid?: string;
  /** Meta's ad id. The single most useful field for joining a CRM row back to
      Ads Manager, and the one every UTM capture forgets. */
  utm_id?: string;
  /** Click time in ms, for the `fb.1.<ts>.<fbclid>` rebuild. */
  ts?: number;
  /** First-touch context. */
  referrer?: string;
  landing_url?: string;
};

function readAttr(): Attribution {
  try {
    const ls = window.localStorage.getItem(ATTR_KEY);
    if (ls) return JSON.parse(ls) as Attribution;
  } catch {
    /* private mode, or storage disabled */
  }
  try {
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${ATTR_KEY}=([^;]+)`));
    if (m) return JSON.parse(decodeURIComponent(m[1])) as Attribution;
  } catch {
    /* malformed cookie — treat as absent rather than throwing */
  }
  return {};
}

function writeAttr(attr: Attribution) {
  const json = JSON.stringify(attr);
  try {
    window.localStorage.setItem(ATTR_KEY, json);
  } catch {
    /* nothing to do; the cookie below is the fallback */
  }
  try {
    const maxAge = ATTR_TTL_DAYS * 24 * 60 * 60;
    document.cookie = `${ATTR_KEY}=${encodeURIComponent(json)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  } catch {
    /* nothing to do */
  }
}

/** Runs on every page mount. See the two storage models above. */
export function captureParams() {
  if (typeof window === 'undefined') return;
  try {
    const sp = new URLSearchParams(window.location.search);
    const g = (k: string) => sp.get(k) || '';
    const url = {
      source: g('utm_source'),
      medium: g('utm_medium'),
      campaign: g('utm_campaign'),
      content: g('utm_content'),
      term: g('utm_term'),
      fbclid: g('fbclid'),
      gclid: g('gclid'),
      utm_id: g('utm_id'),
    };
    const hasAttribution = Object.values(url).some(Boolean);

    const attr = readAttr();
    let changed = false;

    /* CONTEXT — first-touch. Set once, even when the entry is untagged. */
    if (!attr.landing_url) {
      attr.landing_url = window.location.href;
      attr.referrer = document.referrer || '';
      changed = true;
    }

    /* ATTRIBUTION — last-touch. */
    if (hasAttribution) {
      Object.assign(attr, url, { ts: Date.now() });
      changed = true;
    }

    if (changed) writeAttr(attr);
  } catch {
    /* never break a page over tracking */
  }
}

/**
 * Read at checkout submit.
 *
 * LIVE URL FIRST, then storage: a buyer can land straight on /checkout with
 * attribution on the URL before captureParams() has run for that page, and
 * that set must still win over whatever was stored earlier.
 */
export function restoreParams(): Attribution {
  if (typeof window === 'undefined') return {};
  const attr = readAttr();
  try {
    const sp = new URLSearchParams(window.location.search);
    const live: Record<string, string | null> = {
      source: sp.get('utm_source'),
      medium: sp.get('utm_medium'),
      campaign: sp.get('utm_campaign'),
      content: sp.get('utm_content'),
      term: sp.get('utm_term'),
      fbclid: sp.get('fbclid'),
      gclid: sp.get('gclid'),
      utm_id: sp.get('utm_id'),
    };
    if (Object.values(live).some(Boolean)) {
      Object.assign(
        attr,
        Object.fromEntries(Object.entries(live).filter(([, v]) => v)),
      );
      if (!attr.ts) attr.ts = Date.now();
    }
  } catch {
    /* fall through with whatever storage gave us */
  }
  return attr;
}

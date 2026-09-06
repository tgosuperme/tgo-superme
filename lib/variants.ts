/**
 * Message match from ads: the headline variant (?h=) and the pain the ad was
 * about (?p=).
 *
 * ── WHY THIS IS A PRE-PAINT SCRIPT AND NOT `searchParams` ───────────────────
 * The obvious build is to read searchParams in the Server Component and render
 * the right headline. It works, and it costs the whole page its static
 * rendering: in the App Router, touching searchParams opts a route into
 * dynamic rendering permanently. This page is the destination of paid traffic,
 * where time-to-first-byte is money, and it is otherwise a perfect ISR
 * candidate.
 *
 * So both variants are rendered into the HTML and CSS picks one, driven by a
 * `data-h` / `data-p` attribute set on <html> by the inline script below. The
 * script runs BEFORE FIRST PAINT — same mechanism the page already uses for
 * `bw-js` — so there is no flash of the wrong headline, which is the failure
 * that rules out doing this in a React effect.
 *
 * The cost is a few hundred bytes of duplicated headline in the HTML. That is
 * a fraction of what dynamic rendering would cost on every single visit.
 *
 * ── THE VALUES HAVE TO SURVIVE THE ROUND TRIP ───────────────────────────────
 * `headline_variant` and `pain` are needed in three places the URL cannot
 * reach on its own:
 *
 *   · on every Meta event, as a custom parameter
 *   · in the Razorpay `notes`, so the CRM row records which ad copy sold
 *   · on the buyer's return to /confirmed
 *
 * A CTA click leaves for a payment page we do not host, so the script mirrors
 * both values into localStorage AND a cookie. localStorage is for the client;
 * the cookie is the only one /go can read, because a server route cannot read
 * localStorage. That is the same reason lib/track.ts mirrors attribution to a
 * cookie, and this piggybacks on the pattern.
 *
 * Persisted for the session so a reader who clicks through to the page a
 * second time without the parameter still sees the variant the ad promised.
 */

export const VARIANT_COOKIE = 'superme_v';

/** The two headline variants. `a` is the default and needs no parameter. */
export type HeadlineVariant = 'a' | 'b';
/** The pains an ad can be targeted at. Absent means the general eyebrow. */
export type PainKey = 'back' | 'neck' | 'knee';

export const PAIN_KEYS: PainKey[] = ['back', 'neck', 'knee'];

/** The eyebrow's first word group, per pain. Keyed to the `data-p` attribute. */
export const PAIN_EYEBROW: Record<PainKey | 'all', string> = {
  all: 'For Adults 35+ With Back, Neck Or Knee Pain That Keeps Coming Back',
  back: 'For Adults 35+ With Back Pain That Keeps Coming Back',
  neck: 'For Adults 35+ With Neck Pain That Keeps Coming Back',
  knee: 'For Adults 35+ With Knee Pain That Keeps Coming Back',
};

/**
 * The inline script, as a string, for dangerouslySetInnerHTML.
 *
 * Written as ES5 with no optional chaining and wrapped in try/catch from end
 * to end. It runs before anything else on the page, in whatever browser the
 * ad clicked through from — including the in-app browsers inside Instagram and
 * Facebook, which is most of this traffic. A syntax error here would blank the
 * page, and a thrown exception would stop the `bw-js` class being added, so
 * every scroll reveal on the page would stay at opacity 0.
 *
 * Deliberately does NOT write the cookie with `Secure` on localhost: the flag
 * would silently drop it over plain http and /go would read nothing in dev.
 */
export const VARIANT_SCRIPT = `
(function(){
  try{
    var d=document, root=d.documentElement, q, h, p, i, raw, saved;
    try{ q=new URLSearchParams(location.search); }catch(e){ q=null; }

    function read(k){
      try{ return window.localStorage.getItem(k); }catch(e){ return null; }
    }
    function write(k,v){
      try{ window.localStorage.setItem(k,v); }catch(e){}
    }

    h = q ? q.get('h') : null;
    p = q ? q.get('p') : null;

    if(h!=='a' && h!=='b') h = null;
    if(p!=='back' && p!=='neck' && p!=='knee') p = null;

    /* URL wins; otherwise whatever the session already saw. */
    if(!h) h = read('superme_h');
    if(!p) p = read('superme_p');

    if(h!=='a' && h!=='b') h='a';
    if(p!=='back' && p!=='neck' && p!=='knee') p=null;

    write('superme_h',h);
    if(p) write('superme_p',p);

    root.setAttribute('data-h',h);
    root.setAttribute('data-p',p||'all');

    /* The only copy a server route can read. Session cookie, root path, Lax —
       it is read on a same-site GET to /go and nothing else needs it. */
    try{
      var val = encodeURIComponent(h + '|' + (p||''));
      var sec = location.protocol === 'https:' ? ';Secure' : '';
      d.cookie = '${VARIANT_COOKIE}=' + val + ';path=/;max-age=86400;SameSite=Lax' + sec;
    }catch(e){}
  }catch(e){}
})();
`.trim();

/** Parse the cookie /go reads. Returns the default variant on anything odd. */
export function parseVariantCookie(raw: string | undefined | null): {
  headline: HeadlineVariant;
  pain: PainKey | '';
} {
  const fallback = { headline: 'a' as HeadlineVariant, pain: '' as const };
  if (!raw) return fallback;
  try {
    const [h, p] = decodeURIComponent(raw).split('|');
    return {
      headline: h === 'b' ? 'b' : 'a',
      pain: (PAIN_KEYS as string[]).includes(p) ? (p as PainKey) : '',
    };
  } catch {
    return fallback;
  }
}

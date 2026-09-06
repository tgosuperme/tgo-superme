/**
 * Turning whatever URL is in env into one that can actually carry attribution.
 *
 * ── THE BUG THIS EXISTS TO FIX ──────────────────────────────────────────────
 * Razorpay hands out two forms of link for the same Payment Page:
 *
 *     https://rzp.io/rzp/gmoTfXX                        the "share" shortlink
 *     https://pages.razorpay.com/pl_TS7plD5cahZ5oX/view the page itself
 *
 * The dashboard's Copy-link button gives the SHORTLINK, so that is what gets
 * pasted into env — and the shortlink is a plain 302 that rebuilds the target
 * from scratch. It does not forward the query string. Measured, both pages:
 *
 *     GET https://rzp.io/rzp/gmoTfXX?ref_id=v1ABC&ref_id2=DEF
 *     302 https://pages.razorpay.com/pl_TS7plD5cahZ5oX/view      ← no ?ref_id
 *
 * /go's whole job is to stamp `ref_id` onto the checkout URL. Through a
 * shortlink that stamp was being thrown away one hop later, so the Payment
 * Page's ref_id fields arrived empty, every payment failed the webhook's
 * ownership gate, and every sale was dropped as somebody else's. Silently:
 * the buyer pays, the page says thank you, and nothing reaches the sheet.
 *
 * ── WHY RESOLVE AT RUNTIME RATHER THAN JUST FIXING THE ENV VAR ──────────────
 * The env vars now hold the long form, so in the normal case this does no work
 * at all. But the shortlink is what the Razorpay UI offers, this funnel is
 * handed over to people who will re-copy these links when a page is re-made,
 * and the failure is invisible from the outside. A link that silently loses
 * every sale must not be one paste away.
 *
 * One redirect hop, cached per lambda for the life of the process. Page ids
 * are permanent, so a hit is good forever; a miss falls back to the original
 * URL, because a checkout that opens without attribution still takes the money
 * and is recoverable by hand, while a dead button is not.
 */

/** Resolved shortlink → canonical URL. Module scope: one lookup per lambda. */
const resolved = new Map<string, string>();

/** Hosts that 302 to the real page and drop the query string doing it. */
function isShortlink(url: string): boolean {
  try {
    return new URL(url).hostname.replace(/^www\./, '') === 'rzp.io';
  } catch {
    return false;
  }
}

/**
 * The URL to send a buyer to, with the query string guaranteed to survive.
 *
 * Never throws and never returns empty when given something non-empty: on any
 * failure the caller gets its input back and the buyer still reaches a
 * checkout. Attribution is worth a lot; it is not worth a lost sale.
 */
export async function canonicalCheckoutUrl(url: string): Promise<string> {
  if (!url || !isShortlink(url)) return url;

  const cached = resolved.get(url);
  if (cached) return cached;

  try {
    /* `manual` so fetch hands us the Location header instead of following it —
       we want the destination, not its body. AbortSignal so a slow Razorpay
       cannot hold a buyer on a blank page: 2.5s then give up and use the
       shortlink, which at worst costs this one sale its attribution. */
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(2500),
      cache: 'no-store',
    });

    const location = res.headers.get('location');
    if (location) {
      /* Resolved against the shortlink in case Razorpay ever returns a
         relative Location — the spec allows it and `new URL` would throw. */
      const target = new URL(location, url).toString();
      resolved.set(url, target);
      console.info(`[checkout-url] resolved shortlink ${url} -> ${target}`);
      return target;
    }

    console.warn(
      `[checkout-url] ${url} did not redirect (status ${res.status}) — ` +
        'sending the buyer to it unresolved; ref_id may not reach Razorpay',
    );
  } catch (err) {
    console.warn(
      `[checkout-url] could not resolve ${url}: ${String(err)} — ` +
        'sending the buyer to it unresolved; ref_id may not reach Razorpay',
    );
  }

  return url;
}

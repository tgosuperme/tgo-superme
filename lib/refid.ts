import zlib from 'node:zlib';

/**
 * The `ref_id` token — the whole attribution payload as ONE alphanumeric
 * string, carried through a hosted Razorpay Payment Page.
 *
 * ── WHY BASE62 AND NOT BASE64 ───────────────────────────────────────────────
 * Razorpay's Payment Page prefill validator accepts [A-Za-z0-9] and NOTHING
 * else. Any other character silently voids the ENTIRE value — the field renders
 * blank, no error, no truncation. Verified against the live page:
 *
 *     AAAAA11111BBBBB22222      ✅ populates
 *     AAAAA-11111-BBBBB-22222   ❌ blank        (hyphen)
 *     AAAAA_11111_BBBBB_22222   ❌ blank        (underscore)
 *     AAAAA.11111.BBBBB.22222   ❌ blank        (dot)
 *     AAAAA~11111~BBBBB~22222   ❌ blank        (tilde)
 *     745 chars, alphanumeric   ✅ populates in full
 *
 * base64url is built from `-` and `_`, so it can never work here. That is not a
 * length problem and no amount of shortening fixes it. base62 uses the digits
 * and both cases of the alphabet and nothing else, which is exactly the set
 * Razorpay allows.
 *
 * LENGTH IS NOT THE CONSTRAINT. 745 alphanumeric characters was proven to
 * populate; a full real-world payload encodes to ~744. The `MAX_SAFE` valve
 * below exists only so an absurd outlier can never quietly exceed what we have
 * actually tested.
 *
 * ── WHAT IS IN IT ───────────────────────────────────────────────────────────
 * Single-letter keys, because JSON key names are dead weight repeated on every
 * sale. `fbclid` is deliberately NOT stored: it is already the tail of `c`,
 * recoverable by splitting on the third dot, and storing it twice would cost
 * ~171 characters for nothing.
 */

export type Attr = {
  /** event_id + lead_id + purchase_event_id — one uuid, minted in /go. */
  i: string;
  /** _fbp cookie. */
  p?: string;
  /** _fbc, hybrid: the cookie, else rebuilt as fb.1.<ts>.<fbclid>. */
  c?: string;
  /** Real client IP, read off the browser's own request to /go. */
  a?: string;
  /** Real user agent, same. */
  u?: string;
  s?: string; // utm_source
  m?: string; // utm_medium
  n?: string; // utm_campaign
  o?: string; // utm_content
  t?: string; // utm_term
  d?: string; // utm_id
  r?: string; // referrer, first-touch
  l?: string; // landing_url, first-touch
};

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PREFIX = 'v1';

/** Proven-good ceiling. See the note above — a valve, not a real limit. */
const MAX_SAFE = 740;

/**
 * A leading 0x01 sentinel is prepended before the big-integer conversion.
 * Without it a payload whose first byte is 0x00 would lose that byte on the
 * way back, because leading zeroes vanish in any positional base.
 */
function encode62(buf: Buffer): string {
  let n = 1n;
  for (const b of buf) n = (n << 8n) | BigInt(b);
  let out = '';
  while (n > 0n) {
    out = ALPHABET[Number(n % 62n)] + out;
    n /= 62n;
  }
  return out;
}

function decode62(str: string): Buffer {
  let n = 0n;
  for (const ch of str) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) throw new Error('ref_id contains a non-base62 character');
    n = n * 62n + BigInt(v);
  }
  const bytes: number[] = [];
  while (n > 1n) {
    bytes.unshift(Number(n & 0xffn));
    n >>= 8n;
  }
  return Buffer.from(bytes);
}

function pack(attr: Attr): string {
  const json = JSON.stringify(attr);
  return PREFIX + encode62(zlib.brotliCompressSync(Buffer.from(json, 'utf8')));
}

/**
 * Encodes the attribution blob.
 *
 * If the result somehow exceeds MAX_SAFE it retries without `l` and `r` — the
 * landing URL and referrer are CRM audit fields, not Meta match keys, so
 * dropping them costs two sheet columns rather than any conversion quality.
 * Everything Meta matches on stays.
 */
export function encodeRefId(attr: Attr): string {
  const full = pack(attr);
  if (full.length <= MAX_SAFE) return full;
  const { l, r, ...lean } = attr;
  const trimmed = pack(lean);
  console.warn(
    `[refid] ${full.length} chars exceeded ${MAX_SAFE}; dropped landing_url and referrer, now ${trimmed.length}`,
  );
  return trimmed;
}

/**
 * Decodes a token from the webhook.
 *
 * Returns null rather than throwing for ANY malformed input. A sale with no
 * attribution is still a sale: the webhook must report it with whatever
 * Razorpay supplied rather than fail the whole handler over a tracking field.
 */
export function decodeRefId(token: string | undefined | null): Attr | null {
  if (!token || !token.startsWith(PREFIX)) return null;
  try {
    const json = zlib.brotliDecompressSync(decode62(token.slice(PREFIX.length)));
    const attr = JSON.parse(json.toString('utf8')) as Attr;
    return attr && typeof attr.i === 'string' ? attr : null;
  } catch (err) {
    console.error('[refid] could not decode', err);
    return null;
  }
}

/** The click id, recovered from `c` rather than stored separately. */
export function fbclidFrom(attr: Attr | null): string {
  const c = attr?.c ?? '';
  const parts = c.split('.');
  return parts.length > 3 ? parts.slice(3).join('.') : '';
}

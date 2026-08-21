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
 * ── TWO DIFFERENT LIMITS, AND THEY DISAGREE ─────────────────────────────────
 * PREFILL accepts long values: 745 alphanumeric characters populates the field
 * in full. SUBMIT does not — Razorpay caps each `notes` VALUE at 512 characters
 * and rejects the payment outright:
 *
 *     "Notes value cannot be greater 512 characters"
 *
 * So a token can look perfectly fine on the page and still block the payment.
 * That is the worst possible failure: it is invisible until someone tries to
 * pay, and it fails the sale rather than just the tracking.
 *
 * No trim keeps the payload under 512 while holding everything we need —
 * measured: 735 whole, 602 without landing_url, 614 without landing_url and
 * referrer, and only 461 if stripped back to Meta match keys alone, which
 * would empty six CRM columns.
 *
 * So the token is CHUNKED across two fields of 500 characters. Two fields is
 * 1000 characters of capacity against a 735-character token, and the worst of
 * 300 randomised payloads was 744. `ref_id` and `ref_id2` on the Razorpay page;
 * the webhook concatenates them before decoding.
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

/** Razorpay's hard per-value cap is 512. 500 leaves margin for their counting
    to differ from ours by a character or two. */
export const CHUNK = 500;
/** Two fields on the page, so two chunks of CHUNK is the whole budget. */
const MAX_SAFE = CHUNK * 2;

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
  /* Only reachable if a payload somehow needs more than 1000 characters.
     landing_url and referrer are CRM audit fields, not Meta match keys, so
     dropping them costs two sheet columns rather than conversion quality. */
  const { l, r, ...lean } = attr;
  const trimmed = pack(lean);
  console.warn(
    `[refid] ${full.length} chars exceeded ${MAX_SAFE}; dropped landing_url and referrer, now ${trimmed.length}`,
  );
  return trimmed;
}

/**
 * The token split into per-field chunks, each within Razorpay's 512 cap.
 *
 * Returned in order. /go writes them to ref_id and ref_id2; the webhook
 * concatenates in the same order before decoding. The split is a plain slice —
 * no per-chunk framing — because the pieces are only ever reassembled whole.
 */
export function chunkRefId(attr: Attr): string[] {
  const token = encodeRefId(attr);
  const out: string[] = [];
  for (let i = 0; i < token.length; i += CHUNK) out.push(token.slice(i, i + CHUNK));
  return out;
}

/**
 * Reassembles the token from Razorpay's `notes`.
 *
 * Order is fixed and explicit rather than derived from Object.keys, which has
 * no guaranteed order for a JSON object arriving over the wire. A missing
 * second chunk yields a token that fails to decode, which decodeRefId turns
 * into null — the sale still reports, with Razorpay's own fields.
 */
export function joinRefId(notes: Record<string, string> | undefined): string {
  const n = notes ?? {};
  return [n.ref_id, n.ref_id2, n.ref_id3].filter(Boolean).join('');
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

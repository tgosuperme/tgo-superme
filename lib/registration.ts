import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The free registration — the funnel's new first step.
 *
 * SERVER ONLY (node:crypto). The browser-side half, which remembers what was
 * typed so the OTO can greet them and the checkout can prefill itself, lives in
 * lib/registration-client.ts.
 *
 * ── WHY A SIGNED TOKEN ────────────────────────────────────────────────────
 * /confirmed shows the joining instructions, and a free seat has no Stripe
 * session to verify against. Without something to check, the page would be open
 * to anyone who typed the address — which is the exact hole that was closed on
 * the paid side.
 *
 * There is no database in this funnel, so the proof travels with the reader: an
 * HMAC over their email and the issue time, signed with a server secret. It
 * cannot be forged without the secret and it cannot be replayed indefinitely
 * because it carries its own expiry. Nothing to store, nothing to look up.
 */

/** What the form collects. Identical to the checkout's fields, deliberately. */
export type RegistrationFields = {
  firstName: string;
  lastName: string;
  email: string;
  /** E.164, e.g. "+447700900123". */
  phone: string;
  /** ISO 3166-1 alpha-2 the reader picked on the dialling-code selector. */
  phoneCountry: string;
  city: string;
};

/**
 * The secret the token is signed with.
 *
 * Falls back to the Stripe secret key rather than to a literal: that value is
 * always present in a working deployment, is never shipped to the browser, and
 * is stable across restarts. A hard-coded fallback would make every token
 * forgeable by anyone who read this file.
 */
function secret(): string {
  return (
    process.env.REGISTRATION_SECRET?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim() ||
    ''
  );
}

/** Tokens stop working after this, so a shared link cannot hand out access. */
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

/**
 * The cookie the free confirmation page reads.
 *
 * ── WHY A COOKIE AND NOT THE QUERY STRING ─────────────────────────────────
 * /confirmed is a Server Component, and the browser's copy of the registration
 * lives in sessionStorage, which the server cannot see. The alternatives were
 * putting the email and token in the URL — where they land in history, in the
 * referrer header and in anything the reader pastes to a friend — or rendering
 * the page client-side and losing the server gate entirely.
 *
 * httpOnly, so no script can read it; sameSite lax, so it survives the ordinary
 * top-level navigation from the OTO; secure in production only, because
 * localhost is not https and a secure cookie there is simply dropped.
 */
export const REG_COOKIE = 'sm_reg';
export const REG_COOKIE_MAX_AGE = Math.floor(TOKEN_TTL_MS / 1000);

/** `<email>|<token>` — both halves are needed to verify either. */
export function packRegistrationCookie(email: string, token: string): string {
  return `${email.trim().toLowerCase()}|${token}`;
}

export function unpackRegistrationCookie(
  value: string | undefined,
): { email: string; token: string } | null {
  if (!value) return null;
  const at = value.lastIndexOf('|');
  if (at <= 0) return null;
  const email = value.slice(0, at);
  const token = value.slice(at + 1);
  if (!email || !token) return null;
  return { email, token };
}

/**
 * `<issuedAtMs>.<hmac>` — the email is NOT in the token.
 *
 * It is in the signature instead, so the token can be checked against an email
 * we already hold without the address itself travelling in a URL, a referrer
 * header or a browser history entry.
 */
export function signRegistration(email: string, now = Date.now()): string {
  const key = secret();
  if (!key) return '';
  const issued = String(now);
  const mac = createHmac('sha256', key)
    .update(`${issued}.${email.trim().toLowerCase()}`)
    .digest('hex');
  return `${issued}.${mac}`;
}

/**
 * True when `token` was issued by us for `email` and has not expired.
 *
 * timingSafeEqual rather than `===`: comparing MACs with a short-circuiting
 * string compare leaks, byte by byte, how much of a guess was right.
 */
export function verifyRegistration(token: string, email: string): boolean {
  const key = secret();
  if (!key || !token || !email) return false;

  const [issued, mac] = token.split('.');
  if (!issued || !mac) return false;

  const issuedAt = Number(issued);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > TOKEN_TTL_MS) return false;
  /* A token stamped in the future is a tampered one. */
  if (issuedAt - Date.now() > 60_000) return false;

  const expected = createHmac('sha256', key)
    .update(`${issued}.${email.trim().toLowerCase()}`)
    .digest('hex');

  const a = Buffer.from(mac, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

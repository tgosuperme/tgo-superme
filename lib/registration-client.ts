import type { RegistrationFields } from './registration';

/**
 * What the browser remembers about the person between the modal and the till.
 *
 * The funnel is three pages now — register, choose, pay — and the reader types
 * their details once, on the first. The OTO greets them by name and the Stripe
 * session is prefilled from this, so nobody is asked for an email twice.
 *
 * ── sessionStorage, NOT localStorage ──────────────────────────────────────
 * It holds a name, an email and a phone number. sessionStorage is cleared when
 * the tab closes, which is the right lifetime for something that exists only to
 * carry one purchase across three pages; localStorage would leave it on a
 * shared or family computer indefinitely.
 *
 * ── EVERY READ IS GUARDED ─────────────────────────────────────────────────
 * Access throws outright in some privacy modes rather than returning null, and
 * a thrown storage read in a render is a blank page. Nothing here is load
 * bearing: a reader whose browser refuses storage simply types their details
 * again at the checkout, which is exactly what they did before this existed.
 */

const KEY = 'superme_registration';

export type StoredRegistration = RegistrationFields & {
  /** Proves the registration happened, for the free confirmation page. */
  token: string;
};

export function saveRegistration(reg: StoredRegistration): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(reg));
  } catch {
    /* Private mode, or storage disabled. The funnel still works. */
  }
}

export function readRegistration(): StoredRegistration | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredRegistration>;
    /* An email is the one field everything downstream depends on, so a record
       without one is treated as no record at all rather than half a one. */
    if (!parsed || typeof parsed.email !== 'string' || !parsed.email) return null;
    return parsed as StoredRegistration;
  } catch {
    return null;
  }
}

export function clearRegistration(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

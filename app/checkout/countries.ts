/**
 * Dialling codes for the checkout's phone field.
 *
 * A hand-kept list rather than libphonenumber-js, which is ~150KB gzipped and
 * would be the single largest thing on a page whose whole job is one form. The
 * trade is honest: this validates LENGTH per country, not whether a number is
 * genuinely allocated. That is enough to catch the real failure — a typo or a
 * half-typed number — without rejecting valid numbers we do not know about.
 *
 * `min`/`max` are the national significant number: the digits AFTER the
 * dialling code and after any trunk prefix (the UK's leading 0) is stripped.
 * Ranges are deliberately generous except where they are well known and fixed
 * (AE, SA, GB, US, CA, IN, AU); a validator that rejects a real customer's
 * number is far more expensive than one that lets a bad one through to a
 * bounced message.
 *
 * ── THE GULF SITS FIRST ──────────────────────────────────────────────────
 * The UAE is the default and the six GCC states lead the list, because the
 * funnel is priced in AED and targeted at Gulf traffic. Saudi, Kuwait, Qatar,
 * Bahrain and Oman were ADDED with that move: a Saudi lead previously had no
 * dialling code to pick and could not finish the form at all, which is the
 * kind of thing that looks like a conversion-rate problem rather than a
 * missing list entry.
 *
 * The UK stays on the list, directly below them. The coach is UK-based and the
 * sessions are quoted in UK time, so UK sign-ups are expected, just no longer
 * the default answer.
 */

export type Country = {
  /** ISO 3166-1 alpha-2, also used to derive the flag. */
  iso: string;
  name: string;
  /** Dialling code without the +. */
  dial: string;
  /** National significant number length, after any trunk 0 is removed. */
  min: number;
  max: number;
};

export const COUNTRIES: Country[] = [
  /* GCC first — see the note above. Gulf mobile numbers are a fixed 8 or 9
     significant digits, so these ranges are tight rather than generous. */
  { iso: 'AE', name: 'United Arab Emirates', dial: '971', min: 8, max: 9 },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966', min: 9, max: 9 },
  { iso: 'KW', name: 'Kuwait', dial: '965', min: 8, max: 8 },
  { iso: 'QA', name: 'Qatar', dial: '974', min: 8, max: 8 },
  { iso: 'BH', name: 'Bahrain', dial: '973', min: 8, max: 8 },
  { iso: 'OM', name: 'Oman', dial: '968', min: 8, max: 8 },
  { iso: 'GB', name: 'United Kingdom', dial: '44', min: 9, max: 10 },
  { iso: 'IE', name: 'Ireland', dial: '353', min: 7, max: 9 },
  { iso: 'US', name: 'United States', dial: '1', min: 10, max: 10 },
  { iso: 'CA', name: 'Canada', dial: '1', min: 10, max: 10 },
  { iso: 'AU', name: 'Australia', dial: '61', min: 9, max: 9 },
  { iso: 'NZ', name: 'New Zealand', dial: '64', min: 8, max: 10 },
  { iso: 'IN', name: 'India', dial: '91', min: 10, max: 10 },
  { iso: 'ZA', name: 'South Africa', dial: '27', min: 9, max: 9 },
  { iso: 'SG', name: 'Singapore', dial: '65', min: 8, max: 8 },
  { iso: 'HK', name: 'Hong Kong', dial: '852', min: 8, max: 8 },
  { iso: 'DE', name: 'Germany', dial: '49', min: 6, max: 12 },
  { iso: 'FR', name: 'France', dial: '33', min: 9, max: 9 },
  { iso: 'ES', name: 'Spain', dial: '34', min: 9, max: 9 },
  { iso: 'IT', name: 'Italy', dial: '39', min: 6, max: 11 },
  { iso: 'PT', name: 'Portugal', dial: '351', min: 9, max: 9 },
  { iso: 'NL', name: 'Netherlands', dial: '31', min: 9, max: 9 },
  { iso: 'BE', name: 'Belgium', dial: '32', min: 8, max: 9 },
  { iso: 'CH', name: 'Switzerland', dial: '41', min: 9, max: 9 },
  { iso: 'AT', name: 'Austria', dial: '43', min: 7, max: 13 },
  { iso: 'SE', name: 'Sweden', dial: '46', min: 7, max: 13 },
  { iso: 'NO', name: 'Norway', dial: '47', min: 8, max: 8 },
  { iso: 'DK', name: 'Denmark', dial: '45', min: 8, max: 8 },
  { iso: 'FI', name: 'Finland', dial: '358', min: 6, max: 12 },
  { iso: 'PL', name: 'Poland', dial: '48', min: 9, max: 9 },
  { iso: 'RO', name: 'Romania', dial: '40', min: 9, max: 9 },
  { iso: 'GR', name: 'Greece', dial: '30', min: 10, max: 10 },
  { iso: 'CZ', name: 'Czechia', dial: '420', min: 9, max: 9 },
  { iso: 'MT', name: 'Malta', dial: '356', min: 8, max: 8 },
  { iso: 'CY', name: 'Cyprus', dial: '357', min: 8, max: 8 },
  { iso: 'PK', name: 'Pakistan', dial: '92', min: 10, max: 10 },
  { iso: 'BD', name: 'Bangladesh', dial: '880', min: 10, max: 10 },
  { iso: 'LK', name: 'Sri Lanka', dial: '94', min: 9, max: 9 },
  { iso: 'NG', name: 'Nigeria', dial: '234', min: 10, max: 10 },
  { iso: 'KE', name: 'Kenya', dial: '254', min: 9, max: 9 },
  { iso: 'MY', name: 'Malaysia', dial: '60', min: 8, max: 10 },
  { iso: 'PH', name: 'Philippines', dial: '63', min: 10, max: 10 },
  { iso: 'JP', name: 'Japan', dial: '81', min: 9, max: 10 },
  { iso: 'BR', name: 'Brazil', dial: '55', min: 10, max: 11 },
  { iso: 'MX', name: 'Mexico', dial: '52', min: 10, max: 10 },
];

export const DEFAULT_ISO = 'AE';

/**
 * An example number per country for the phone field's placeholder. Only the
 * ones worth showing: everywhere else gets the generic "Mobile number", which
 * is better than a plausible-looking example in the wrong format.
 */
export const PHONE_PLACEHOLDERS: Record<string, string> = {
  AE: '50 123 4567',
  SA: '51 234 5678',
  KW: '5123 4567',
  QA: '3312 3456',
  BH: '3600 1234',
  OM: '9212 3456',
  GB: '7700 900000',
};

export function findCountry(iso: string): Country {
  return COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0];
}

/**
 * The flag, derived from the ISO code rather than shipped as an asset: each
 * letter maps to its regional-indicator codepoint, and the pair renders as a
 * flag. Zero bytes, and it cannot fall out of sync with the list.
 *
 * Windows has no flag glyphs and will show the two letters instead, which is
 * why the dialling code always sits next to it rather than relying on the flag
 * to identify the country.
 */
export function flagFor(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

/** Digits only, with a single leading trunk zero removed. */
export function nationalDigits(input: string): string {
  return input.replace(/\D/g, '').replace(/^0+/, '');
}

/** E.164, e.g. "+447700900000". What gets stored and messaged. */
export function toE164(iso: string, input: string): string {
  const country = findCountry(iso);
  return `+${country.dial}${nationalDigits(input)}`;
}

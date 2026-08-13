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
 * (GB, US, CA, IN, AU); a validator that rejects a real customer's number is
 * far more expensive than one that lets a bad one through to a bounced message.
 *
 * The UK sits first and is the default: the offer is priced in GBP and the
 * sessions are quoted in UK time, so it is the overwhelmingly likely answer.
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
  { iso: 'GB', name: 'United Kingdom', dial: '44', min: 9, max: 10 },
  { iso: 'IE', name: 'Ireland', dial: '353', min: 7, max: 9 },
  { iso: 'US', name: 'United States', dial: '1', min: 10, max: 10 },
  { iso: 'CA', name: 'Canada', dial: '1', min: 10, max: 10 },
  { iso: 'AU', name: 'Australia', dial: '61', min: 9, max: 9 },
  { iso: 'NZ', name: 'New Zealand', dial: '64', min: 8, max: 10 },
  { iso: 'IN', name: 'India', dial: '91', min: 10, max: 10 },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971', min: 8, max: 9 },
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

export const DEFAULT_ISO = 'GB';

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

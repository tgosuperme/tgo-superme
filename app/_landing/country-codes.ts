/**
 * Dialling codes for the phone field on the details form.
 *
 * NOT the full ITU list. Around 240 entries is a scrolling wall that makes the
 * common case slower, and the common case here is overwhelmingly India. These
 * are the markets this funnel actually sees — India first, then the diaspora
 * countries the ads reach — with a search box over the top for the rest.
 *
 * `iso` is what the CRM row and Meta's `country` match key want; `dial` is what
 * Razorpay's phone field needs prefixed to the national number. The flag is a
 * regional-indicator pair rather than an image, so the list costs no requests
 * and renders at whatever size the row is.
 */
export type Country = {
  iso: string;
  dial: string;
  name: string;
  flag: string;
};

export const COUNTRIES: Country[] = [
  { iso: 'IN', dial: '91', name: 'India', flag: '🇮🇳' },
  { iso: 'AE', dial: '971', name: 'United Arab Emirates', flag: '🇦🇪' },
  { iso: 'US', dial: '1', name: 'United States', flag: '🇺🇸' },
  { iso: 'GB', dial: '44', name: 'United Kingdom', flag: '🇬🇧' },
  { iso: 'CA', dial: '1', name: 'Canada', flag: '🇨🇦' },
  { iso: 'AU', dial: '61', name: 'Australia', flag: '🇦🇺' },
  { iso: 'SG', dial: '65', name: 'Singapore', flag: '🇸🇬' },
  { iso: 'SA', dial: '966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { iso: 'QA', dial: '974', name: 'Qatar', flag: '🇶🇦' },
  { iso: 'KW', dial: '965', name: 'Kuwait', flag: '🇰🇼' },
  { iso: 'OM', dial: '968', name: 'Oman', flag: '🇴🇲' },
  { iso: 'BH', dial: '973', name: 'Bahrain', flag: '🇧🇭' },
  { iso: 'MY', dial: '60', name: 'Malaysia', flag: '🇲🇾' },
  { iso: 'NZ', dial: '64', name: 'New Zealand', flag: '🇳🇿' },
  { iso: 'ZA', dial: '27', name: 'South Africa', flag: '🇿🇦' },
  { iso: 'DE', dial: '49', name: 'Germany', flag: '🇩🇪' },
  { iso: 'FR', dial: '33', name: 'France', flag: '🇫🇷' },
  { iso: 'IE', dial: '353', name: 'Ireland', flag: '🇮🇪' },
  { iso: 'NL', dial: '31', name: 'Netherlands', flag: '🇳🇱' },
  { iso: 'CH', dial: '41', name: 'Switzerland', flag: '🇨🇭' },
  { iso: 'HK', dial: '852', name: 'Hong Kong', flag: '🇭🇰' },
  { iso: 'JP', dial: '81', name: 'Japan', flag: '🇯🇵' },
  { iso: 'NP', dial: '977', name: 'Nepal', flag: '🇳🇵' },
  { iso: 'LK', dial: '94', name: 'Sri Lanka', flag: '🇱🇰' },
  { iso: 'BD', dial: '880', name: 'Bangladesh', flag: '🇧🇩' },
  { iso: 'PK', dial: '92', name: 'Pakistan', flag: '🇵🇰' },
  { iso: 'TH', dial: '66', name: 'Thailand', flag: '🇹🇭' },
  { iso: 'ID', dial: '62', name: 'Indonesia', flag: '🇮🇩' },
  { iso: 'PH', dial: '63', name: 'Philippines', flag: '🇵🇭' },
  { iso: 'IT', dial: '39', name: 'Italy', flag: '🇮🇹' },
  { iso: 'ES', dial: '34', name: 'Spain', flag: '🇪🇸' },
  { iso: 'SE', dial: '46', name: 'Sweden', flag: '🇸🇪' },
  { iso: 'NO', dial: '47', name: 'Norway', flag: '🇳🇴' },
  { iso: 'DK', dial: '45', name: 'Denmark', flag: '🇩🇰' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

/** Name, ISO or dialling code — whichever the reader types into the search. */
export function searchCountries(q: string): Country[] {
  const s = q.trim().toLowerCase().replace(/^\+/, '');
  if (!s) return COUNTRIES;
  return COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(s) ||
      c.iso.toLowerCase().startsWith(s) ||
      c.dial.startsWith(s),
  );
}

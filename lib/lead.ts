/* The details captured in the pre-booking form, kept for this tab so the
   booking page can pre-fill Calendly and match the call_booked event. */
const KEY = 'sm_lead';

export type Lead = { firstName: string; lastName: string; email: string; phone: string };

export const OPEN_LEAD_EVENT = 'sm:open-lead';

/* The house checkout list (tgo-peeyush, tgo-ankita, tgo-kaizan). ISO-2 travels
   with the dial code: Meta wants the country as a hashed ISO code, and US and
   Canada share +1. */
export const COUNTRIES: { iso: string; dial: string; label: string }[] = [
  { iso: 'in', dial: '+91', label: 'India (+91)' },
  { iso: 'ae', dial: '+971', label: 'UAE (+971)' },
  { iso: 'gb', dial: '+44', label: 'UK (+44)' },
  { iso: 'us', dial: '+1', label: 'USA (+1)' },
  { iso: 'ca', dial: '+1', label: 'Canada (+1)' },
  { iso: 'au', dial: '+61', label: 'Australia (+61)' },
  { iso: 'sg', dial: '+65', label: 'Singapore (+65)' },
  { iso: 'qa', dial: '+974', label: 'Qatar (+974)' },
  { iso: 'om', dial: '+968', label: 'Oman (+968)' },
  { iso: 'kw', dial: '+965', label: 'Kuwait (+965)' },
  { iso: 'sa', dial: '+966', label: 'Saudi Arabia (+966)' },
  { iso: 'nz', dial: '+64', label: 'New Zealand (+64)' },
  { iso: 'za', dial: '+27', label: 'South Africa (+27)' },
  { iso: 'my', dial: '+60', label: 'Malaysia (+60)' },
  { iso: 'de', dial: '+49', label: 'Germany (+49)' },
];

export function saveLead(lead: Lead) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(lead));
  } catch {
    /* storage blocked: the booking page simply will not pre-fill */
  }
}

export function readLead(): Lead | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Lead) : null;
  } catch {
    return null;
  }
}

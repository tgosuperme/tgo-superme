'use client';

import { readAttribution } from '@/lib/attribution';

const EXTERNAL_ID_KEY = 'sm_external_id';

export function getOrCreateExternalId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = localStorage.getItem(EXTERNAL_ID_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(EXTERNAL_ID_KEY, id);
    return id;
  } catch {
    return '';
  }
}

export function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : '';
}

/** Writes Meta's _fbc from ?fbclid, in Meta's own format, if it is not set yet. */
export function captureFbclid(): void {
  if (typeof window === 'undefined') return;
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  if (!fbclid || readCookie('_fbc')) return;
  const value = `fb.1.${Date.now()}.${fbclid}`;
  document.cookie = `_fbc=${value}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
}

/** Client IP and user agent are deliberately absent: the server reads them off the request. */
export function collectSignals() {
  const a = readAttribution();
  return {
    externalId: getOrCreateExternalId(),
    fbc: readCookie('_fbc') || undefined,
    fbp: readCookie('_fbp') || undefined,
    eventSourceUrl: typeof window !== 'undefined' ? window.location.href : '',
    fbclid: a.fbclid || undefined,
  };
}

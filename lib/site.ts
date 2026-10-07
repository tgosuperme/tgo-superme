const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');

if (!configured) {
  console.error(
    '[site] NEXT_PUBLIC_SITE_URL is not set. Canonical urls, og tags and every Meta event_source_url fall back to localhost.',
  );
}

export const SITE_URL = configured || 'http://localhost:3000';
export const SITE_ORIGIN = new URL(SITE_URL);

export const BOOK_HREF = '/book-a-call';
export const THANK_YOU_HREF = '/thank-you';

export const CONTACT_EMAIL =
  (process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '').trim() || 'hello@superme.co.uk';

export const LEGAL_ENTITY = 'MyEntourage Sàrl, Lausanne';

export const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Use' },
  { href: '/refunds', label: 'Refund Policy' },
] as const;

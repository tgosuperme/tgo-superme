import { NextResponse } from 'next/server';

import { capiConfig, capiReady, sendCapiEvent, sha256Hex } from '@/lib/meta-capi';
import { pabblyReady, sendPabblyLead } from '@/lib/pabbly';
import { readClientIp, readClientUserAgent, readRequestCookie } from '@/lib/request-signals';
import { SITE_URL } from '@/lib/site';

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/* The pre-booking form: hands the lead to Pabbly and sends Meta registration_completed.
   Neither failing blocks the visitor, so this always answers 200 on valid input. */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }

  const firstName = str(body.firstName, 80);
  const lastName = str(body.lastName, 80);
  const email = str(body.email, 160).toLowerCase();
  const city = str(body.city, 80);
  const dialCode = str(body.dialCode, 6);
  const rawCountry = str(body.countryCode, 2).toLowerCase();
  const countryCode = /^[a-z]{2}$/.test(rawCountry) ? rawCountry : 'in';
  const phoneDigits = str(body.phone, 20).replace(/\D/g, '');
  if (!firstName || !lastName || !city || !/^\S+@\S+\.\S+$/.test(email) || phoneDigits.length < 6 || !/^\+\d{1,4}$/.test(dialCode)) {
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 });
  }
  const phone = `${dialCode}${phoneDigits}`;

  const leadId = str(body.leadId, 64) || `lead_${Date.now().toString(36)}`;
  const fbc = str(body.fbc) || readRequestCookie(req, '_fbc');
  const fbp = str(body.fbp) || readRequestCookie(req, '_fbp');
  const clientIp = readClientIp(req);
  const clientUserAgent = readClientUserAgent(req);
  const externalId = str(body.externalId, 120);
  const eventSourceUrl = str(body.eventSourceUrl, 1000) || SITE_URL;
  const leadEventId = sha256Hex(`${leadId}|registration_completed`);
  const isTest = Boolean(capiConfig().testEventCode);

  const [pabbly, capi] = await Promise.all([
    pabblyReady()
      ? sendPabblyLead({
          leadId,
          createdAt: new Date().toISOString(),
          firstName,
          lastName,
          email,
          phone,
          dialCode,
          countryCode,
          city,
          fbc,
          fbp,
          clientIp,
          clientUserAgent,
          externalId,
          eventSourceUrl,
          purchaseEventId: leadEventId,
          isTest,
          utmSource: str(body.utmSource),
          utmMedium: str(body.utmMedium),
          utmCampaign: str(body.utmCampaign),
          utmContent: str(body.utmContent),
          utmTerm: str(body.utmTerm),
          fbclid: str(body.fbclid),
          referrer: str(body.referrer, 1000),
          landingUrl: str(body.landingUrl, 1000),
        })
      : Promise.resolve({ ok: false, status: 0 }),
    capiReady()
      ? sendCapiEvent({
          eventName: 'registration_completed',
          eventId: leadEventId,
          eventSourceUrl,
          user: {
            email,
            phone,
            firstName,
            lastName,
            city,
            country: countryCode,
            externalId: externalId || undefined,
            fbc: fbc || undefined,
            fbp: fbp || undefined,
            clientIp: clientIp || undefined,
            clientUserAgent: clientUserAgent || undefined,
          },
        })
      : Promise.resolve({ ok: false, status: 0, body: '' }),
  ]);

  if (pabblyReady() && !pabbly.ok) console.error('[lead] pabbly', pabbly.status);
  return NextResponse.json({ ok: true, leadId, pabbly: pabbly.ok, capi: capi.ok });
}

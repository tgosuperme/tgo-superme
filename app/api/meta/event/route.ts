import { NextResponse } from 'next/server';

import {
  capiReady,
  sendCapiEvent,
  sha256Hex,
  type FunnelStage,
  type SendableEvent,
} from '@/lib/meta-capi';
import { readClientIp, readClientUserAgent, readRequestCookie } from '@/lib/request-signals';
import { SITE_URL } from '@/lib/site';

/* call_booked is accepted from the browser because Calendly's postMessage is the
   only booking signal this build has. It carries no value, so a forged one can
   inflate a count but never a revenue number. */
const ALLOWED: SendableEvent[] = ['ViewContent', 'call_booked'];
const STAGES: FunnelStage[] = ['landing', 'booking'];

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(req: Request) {
  if (!capiReady()) return NextResponse.json({ ok: false, reason: 'capi-not-configured' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }

  const eventName = str(body.eventName) as SendableEvent;
  if (!ALLOWED.includes(eventName)) {
    return NextResponse.json({ ok: false, reason: 'event-not-allowed' }, { status: 400 });
  }

  const rawStage = str(body.stage) as FunnelStage;
  const stage = STAGES.includes(rawStage) ? rawStage : '';
  if (eventName === 'ViewContent' && !stage) {
    return NextResponse.json({ ok: false, reason: 'missing-stage' }, { status: 400 });
  }

  // Body first, request cookie as the catch when the browser reader came back empty.
  const fbc = str(body.fbc) || readRequestCookie(req, '_fbc') || undefined;
  const fbp = str(body.fbp) || readRequestCookie(req, '_fbp') || undefined;
  const email = str(body.email);
  const bookingUid = str(body.bookingUid, 120);
  const externalId = str(body.externalId, 120);

  /* Deterministic ids so Meta's 48h window collapses repeats. The stage is in
     the seed so the landing view and the booking view are two events, not one. */
  const seed = bookingUid || email || externalId || fbp || `${Date.now()}_${Math.random()}`;
  const eventId = sha256Hex(`${seed}|${eventName}|${stage}`);

  const result = await sendCapiEvent({
    eventName,
    eventId,
    eventSourceUrl: str(body.eventSourceUrl, 1000) || SITE_URL,
    user: {
      email: email || undefined,
      phone: str(body.phone, 40) || undefined,
      firstName: str(body.firstName, 80) || undefined,
      lastName: str(body.lastName, 80) || undefined,
      country: 'in',
      externalId: externalId || undefined,
      fbc,
      fbp,
      clientIp: readClientIp(req) || undefined,
      clientUserAgent: readClientUserAgent(req) || undefined,
    },
  });

  if (!result.ok) console.error('[capi]', eventName, result.status, result.body);
  return NextResponse.json({ ok: result.ok, eventName, eventId });
}

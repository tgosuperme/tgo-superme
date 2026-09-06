'use client';

/**
 * "Which timing will you mostly attend?" — one tap, asked once.
 *
 * ── WHY THIS IS WORTH A COMPONENT ───────────────────────────────────────────
 * The Razorpay Payment Page cannot ask it. Every field there is one the buyer
 * must get past to pay, and adding a fifth dropdown to a checkout costs
 * conversions on a page we do not control and cannot A/B test. So it is asked
 * HERE, after the money, where the answer is free.
 *
 * The answer is what makes the 1-hour and 5-minute reminders sendable at all.
 * Sessions run twice a day; without knowing which slot someone intends, the
 * only options are to message everyone twice a day or to guess. One tap here
 * removes that.
 *
 * ── IT MUST NEVER BLOCK THE PAGE ────────────────────────────────────────────
 * The buyer has paid and their joining instructions are directly below this.
 * So: no required state, no modal, no scroll lock. If the POST fails, the UI
 * still says thank you and the failure is logged rather than shown — a red
 * error on a confirmation page reads as "your payment had a problem", which is
 * the single worst thing this page could imply.
 *
 * Answered state is remembered locally as well as sent, so a reload does not
 * re-ask someone who has already answered. localStorage can throw outright
 * (private mode, blocked site data), so every access is wrapped and a failure
 * degrades to asking again — mildly annoying, never broken.
 */

import { CheckCircle } from '@phosphor-icons/react/dist/ssr';
import { useEffect, useState } from 'react';

import { C } from '../_landing/shared';

type Choice = 'morning' | 'evening' | 'both';

export default function TimingPick({
  pid,
  morningLabel,
  eveningLabel,
}: {
  pid: string;
  morningLabel: string;
  eveningLabel: string;
}) {
  const key = `superme_timing_${pid || 'anon'}`;
  const [chosen, setChosen] = useState<Choice | null>(null);
  /* Undefined until the client has looked. Prevents a flash of the question
     for someone who answered it on a previous visit. */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(key);
      if (v === 'morning' || v === 'evening' || v === 'both') setChosen(v);
    } catch {
      /* blocked storage just means we ask again */
    }
    setReady(true);
  }, [key]);

  function choose(c: Choice) {
    setChosen(c);
    try {
      window.localStorage.setItem(key, c);
    } catch {
      /* the answer is still being sent; local memory is only for re-asking */
    }
    /* keepalive: this fires on a page the buyer is about to leave for
       WhatsApp, and without it the request is cancelled on navigation. */
    void fetch('/api/timing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid, timing: c }),
      keepalive: true,
    }).catch((err) => {
      console.error('[timing] not recorded', err);
    });
  }

  if (!ready) return null;

  const OPTIONS: { value: Choice; label: string }[] = [
    { value: 'morning', label: morningLabel },
    { value: 'evening', label: eveningLabel },
    { value: 'both', label: 'Both' },
  ];

  return (
    <div
      data-lego=""
      className="mx-auto mt-3 max-w-[620px] rounded-2xl px-4 py-4"
      style={{ background: C.white, border: `1px solid ${C.line}` }}
    >
      {chosen ? (
        <p className="flex items-center gap-2 text-[13px]" style={{ color: C.inkSoft }}>
          <CheckCircle weight="fill" className="h-4 w-4 shrink-0" style={{ color: C.greenInk }} />
          Noted — we&rsquo;ll remind you before the{' '}
          <strong style={{ color: C.ink }}>
            {chosen === 'both'
              ? 'sessions'
              : chosen === 'morning'
                ? morningLabel
                : eveningLabel}
          </strong>{' '}
          session. You can still come to either.
        </p>
      ) : (
        <>
          <p className="text-[13.5px] font-semibold" style={{ color: C.ink }}>
            Which timing will you mostly attend?
          </p>
          <p className="mt-1 text-[12.5px]" style={{ color: C.inkMuted }}>
            One tap. It only decides when we remind you — you can come to either on
            the day.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => choose(o.value)}
                /* min-h-[44px]: this is a tap target on a phone, and the
                   platform minimum is 44px. */
                className="lego-press inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-[13.5px] font-semibold"
                style={{ background: C.lightBlue, color: C.blue }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

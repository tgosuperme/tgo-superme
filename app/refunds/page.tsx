import type { Metadata } from 'next';

import LegalPage, { type LegalSection } from '../_landing/legal-page';
import { PRICE_LABEL } from '../_landing/shared';

export const metadata: Metadata = {
  title: 'Refund Policy | SuperMe',
  description:
    'Come to Day One. If the 5-Day Pain Reset is not for you, tell us by the end of that day and we refund you in full.',
  robots: { index: true, follow: true },
};

/* The Day-One promise is the offer, not a concession, so it leads. Every other
   section on this page exists to make that promise unambiguous rather than to
   carve exceptions out of it. */
const SECTIONS: LegalSection[] = [
  {
    heading: 'The Day One promise',
    paragraphs: [
      `Come to Day One. If you decide it is not for you, tell us by the end of that day and we refund your ${PRICE_LABEL} in full.`,
      'You do not need to explain yourself, justify the decision or complete a form. One message is enough.',
    ],
  },
  {
    heading: 'How to ask',
    paragraphs: [
      'Email us using the address at the foot of this page, from the address you booked with, and say that Day One was not for you.',
      'That is the whole process. We will confirm by reply and send the money back the same way you paid.',
    ],
  },
  {
    heading: 'How long it takes',
    paragraphs: [
      'We process refunds within two working days of your message. Once processed, your bank or card provider usually takes a further five to ten working days to show it — that part is out of our hands.',
      'The refund goes back to the card or account you paid from. We cannot send it somewhere else.',
    ],
  },
  {
    heading: 'After Day One',
    paragraphs: [
      'The promise is built around Day One because that is the honest test: one full session is enough to know whether the approach suits you, and the challenge is priced so that trying it costs almost nothing.',
      'If you are past Day One and something has genuinely gone wrong — you were unwell, a session did not run, something on our side failed — write to us anyway. We would rather sort it out than hide behind a deadline.',
    ],
  },
  {
    heading: 'If we cancel',
    paragraphs: [
      'If we cancel the challenge or cannot run it as advertised, you get a full refund automatically. You do not have to ask, and you do not have to accept a credit or a place on a later cohort instead.',
    ],
  },
  {
    heading: 'Missed sessions',
    paragraphs: [
      'Every day runs twice, so there are two chances to attend each session. If you miss one entirely, we cannot refund that day on its own — the session ran and the coach was there.',
      'Replays are not guaranteed. The value of the challenge is being seen and corrected live, which is the one thing a recording cannot do.',
    ],
  },
  {
    heading: 'Your legal rights',
    paragraphs: [
      'This policy sits on top of your rights under consumer law, it does not replace them. If the law gives you a stronger right than anything written here, that right applies.',
    ],
  },
];

export default function RefundsPage() {
  return (
    <LegalPage
      eyebrow="Refund Policy"
      title="Come to Day One."
      titleAccent="Then decide."
      intro={`The whole policy in one line: attend Day One, and if it is not for you, tell us by the end of that day and we refund your ${PRICE_LABEL} in full. Everything below is detail.`}
      updated="August 2026"
      sections={SECTIONS}
    />
  );
}

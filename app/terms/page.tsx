import type { Metadata } from 'next';

import LegalPage, { type LegalSection } from '../_landing/legal-page';
import { PRICE_LABEL, SESSION_TIMES_TZ, START_DATE } from '../_landing/shared';

export const metadata: Metadata = {
  title: 'Terms of Use | SuperMe',
  description:
    'What you are buying when you book the 5-Day Pain Reset, what we will do, and what we ask of you.',
  robots: { index: true, follow: true },
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'What you are buying',
    paragraphs: [
      `A place on the 5-Day Pain Reset Challenge: five live, coach-led sessions on Zoom, run by Atul Mishra, starting ${START_DATE}. Each day runs twice, at ${SESSION_TIMES_TZ}, and you may attend whichever suits you and switch between them across the week.`,
      'Your place is personal to you. Please do not share your joining link — the sessions are live and the group is limited so that people can actually be seen and corrected.',
    ],
  },
  {
    heading: 'What we will do',
    paragraphs: [
      'Run the sessions as advertised, on the dates advertised, led by the person advertised.',
      'Send you the joining instructions and links before the challenge starts, and a reminder before each session.',
      'Tell you as soon as we can if anything has to change, and give you a fair option if it does.',
    ],
  },
  {
    heading: 'What we ask of you',
    paragraphs: [
      'Very little, but it matters for the sessions to work.',
    ],
    bullets: [
      'Give us an email address and phone number you actually check — that is how your links reach you.',
      'Turn up on time, with enough space to move and a camera the coach can see you through.',
      'Tell the coach if something hurts, and stop. Nothing in these sessions is worth pushing through pain for.',
      'Treat the coach and the other participants decently. We reserve the right to remove anyone who does not, and to refund them.',
    ],
  },
  {
    heading: 'This is education, not medical care',
    paragraphs: [
      'SuperMe is a yoga and movement education service. It is not a medical service and it is not a substitute for medical care. Nothing said in a session, on this site or in the guides is medical advice, a diagnosis or a treatment plan.',
      'Atul Mishra is a yoga teacher holding a postgraduate diploma in Yoga Education from Kaivalyadhama and an E-RYT 500 certification with Yoga Alliance. He is not a doctor, a physiotherapist or a registered clinician.',
      'Please speak to your doctor or physiotherapist before starting if you are recovering from an injury or surgery, have not been cleared to exercise, or have been told that movement is not appropriate for you. You take part on the basis that you are well enough to do so.',
    ],
  },
  {
    heading: 'Results',
    paragraphs: [
      'We do not promise a specific outcome and we will not pretend otherwise. Any timelines or experiences described on the site come from individual client case files. They are not typical, not predictive and not guaranteed. Bodies, histories and circumstances differ, so results vary from person to person.',
    ],
  },
  {
    heading: 'Recordings and materials',
    paragraphs: [
      'The sessions are live. Replays are not guaranteed, and the challenge is priced and structured on the basis that you attend.',
      'The guides, worksheets and session content belong to SuperMe. You are welcome to use them yourself for as long as you like. Please do not resell them, republish them or pass them on.',
      'Sessions may be recorded for internal review. If a recording would ever be used publicly, we would ask you first.',
    ],
  },
  {
    heading: 'Payment',
    paragraphs: [
      `The price is ${PRICE_LABEL} and is stated once, in full, with nothing added at checkout. Payment is taken by Stripe; your card details do not pass through our systems.`,
      'Refunds are covered on their own page — see the Refund Policy link at the foot of this page.',
    ],
  },
  {
    heading: 'If something goes wrong',
    paragraphs: [
      'If we have to cancel or move a session, we will tell you as soon as we know and offer you either the rescheduled session or your money back.',
      'If a session is disrupted by something neither of us controls — an internet outage, illness, a platform failure — we will make it right rather than argue about who is at fault.',
      'Nothing here limits any right you have under consumer law that cannot be limited.',
    ],
  },
  {
    heading: 'Changes to these terms',
    paragraphs: [
      'We may update this page as the programme changes. The version that applies to you is the one published when you booked, and we will not change the terms of something you have already paid for.',
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms of Use"
      title="What you are buying, and"
      titleAccent="what we owe you"
      intro="The agreement between you and SuperMe when you book a place on the 5-Day Pain Reset, in the plainest language we can manage."
      updated="August 2026"
      sections={SECTIONS}
    />
  );
}

import type { Metadata } from 'next';

import LegalPage, { type LegalSection } from '../_landing/legal-page';
import { SESSION_TIMES, START_DATE } from '../_landing/shared';

export const metadata: Metadata = {
  title: 'Terms of Use | SuperMe',
  description:
    'What you get when you register for the free 5-Day Pain Reset, what we will do, and what we ask of you.',
  robots: { index: true, follow: true },
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'What you are getting',
    paragraphs: [
      `A free place on the 5-Day Pain Reset Challenge: five live, coach-led sessions on Zoom, run by Atul Mishra, starting ${START_DATE}. Each day runs twice, at ${SESSION_TIMES}, and you may attend whichever suits you and switch between them across the week.`,
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
      'Treat the coach and the other participants decently. We reserve the right to remove anyone who does not.',
    ],
  },
  {
    heading: 'This is education, not medical care',
    paragraphs: [
      'SuperMe is a yoga and movement education service. It is not a medical service and it is not a substitute for medical care. Nothing said in a session, on this site or in the guides is medical advice, a diagnosis or a treatment plan.',
      'Atul Mishra is a yoga teacher holding a postgraduate diploma in Yoga Education from Kaivalyadhama and an E-RYT 500 certification with Yoga Alliance. He is not a doctor, a physiotherapist or a registered clinician.',
      'Please speak to your GP or clinician before starting if you are recovering from an injury or surgery, have not been cleared to exercise, or have been told that movement is not appropriate for you. You take part on the basis that you are well enough to do so.',
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
      'The sessions are live. Replays are not guaranteed, and the challenge is structured on the basis that you attend.',
      'The guides, worksheets and session content belong to SuperMe. You are welcome to use them yourself for as long as you like. Please do not resell them, republish them or pass them on.',
      'Sessions may be recorded for internal review. If a recording would ever be used publicly, we would ask you first.',
    ],
  },
  {
    heading: 'What it costs',
    paragraphs: [
      'Nothing. The challenge is free to attend, we do not ask for a card, and there is no payment to make at any point before, during or after the five days.',
      'Nothing you register for here renews, converts into a subscription, or starts a trial that later charges you. On Day 5 we describe how to continue with SuperMe if you would like to, and that is a separate decision you would make on its own terms.',
      'Because there is nothing to pay, there is nothing to refund. Cancelling your place is covered on its own page — see the Cancellations link at the foot of this page.',
    ],
  },
  {
    heading: 'If something goes wrong',
    paragraphs: [
      'If we have to cancel or move a session, we will tell you as soon as we know and offer you the rescheduled session or a place on the next cohort.',
      'If a session is disrupted by something neither of us controls — an internet outage, illness, a platform failure — we will make it right rather than argue about who is at fault.',
      'Nothing here limits any right you have under consumer law that cannot be limited.',
    ],
  },
  {
    heading: 'Changes to these terms',
    paragraphs: [
      'We may update this page as the programme changes. The version that applies to you is the one published when you registered, and we will not change the terms of a cohort you have already claimed a place on.',
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms of Use"
      title="What you are getting, and"
      titleAccent="what we owe you"
      intro="The agreement between you and SuperMe when you claim a free place on the 5-Day Pain Reset, in the plainest language we can manage."
      updated="August 2026"
      sections={SECTIONS}
    />
  );
}

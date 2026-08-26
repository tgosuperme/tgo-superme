import type { Metadata } from 'next';

import LegalPage, { type LegalSection } from '../_landing/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy | SuperMe',
  description:
    'What SuperMe collects when you register for the free 5-Day Pain Reset, why, and what you can ask us to do with it. No payment details, ever.',
  robots: { index: true, follow: true },
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'What we collect',
    paragraphs: [
      'Only what we need to run the challenge. The challenge is free, so there is no payment information of any kind: we never ask for a card, and no card number, expiry or billing address exists for us to hold, lose or be asked about.',
    ],
    bullets: [
      'Your name, email address, mobile number and town, given by you on the registration form.',
      'Basic technical information your browser sends to any website, such as the pages you opened and roughly where in the world you opened them from.',
    ],
  },
  {
    heading: 'Why we hold it',
    paragraphs: [
      'Your contact details exist so we can send you the joining instructions, the Zoom links and the session reminders. That is the whole of what you registered for, and we cannot deliver it without them.',
      'Your town helps us schedule cohorts and understand where people are joining from. It is never used to identify you individually.',
      'If you have told us we may, we will also email you about future SuperMe programmes. If you have not, we will not.',
    ],
  },
  {
    heading: 'Who else sees it',
    paragraphs: [
      'A small number of services that make the site work. Each one only receives what it needs to do its job, and none of them are permitted to use your details for their own purposes.',
    ],
    bullets: [
      'Our email and messaging tools, to send you the joining information.',
      'Our automation and spreadsheet tools, which hold the registration list the cohort is run from.',
      'Our website host, which stores the site and serves it to you.',
    ],
  },
  {
    heading: 'We do not sell your data',
    paragraphs: [
      'We have never sold personal information and we do not intend to. We do not share it with advertisers, brokers or anyone else who would use it to market their own products to you.',
    ],
  },
  {
    heading: 'How long we keep it',
    paragraphs: [
      'Contact details are kept while you are an active participant and for a reasonable period afterwards, so that we can answer questions about a programme you attended.',
      'There are no payment records, so nothing here is held for the years that accounting and tax rules would otherwise demand.',
      'When a record is no longer needed, it is deleted.',
    ],
  },
  {
    heading: 'What you can ask us to do',
    paragraphs: [
      'You can ask us at any time, and you do not have to give a reason.',
    ],
    bullets: [
      'Tell you what we hold about you.',
      'Correct anything that is wrong.',
      'Delete your details. Since there are no payment records, there is nothing we are obliged to keep against your wishes.',
      'Stop emailing you. Every email we send also carries a one-click unsubscribe link.',
    ],
  },
  {
    heading: 'Cookies',
    paragraphs: [
      'The site uses the small number of cookies needed to make pages load properly, to remember where a visit came from, and to show you your confirmation after you register. We do not use cookies to build a profile of you across other websites.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'SuperMe programmes are intended for adults. We do not knowingly collect information from anyone under 18, and if we learn that we have, we delete it.',
    ],
  },
  {
    heading: 'Changes to this policy',
    paragraphs: [
      'If we change how we handle your information, we will update this page and change the date at the top of it. Where a change is significant, we will tell you directly rather than relying on you to notice.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="How we look after"
      titleAccent="your information"
      intro="Plainly: what we collect when you register for the free 5-Day Pain Reset, why we need it, who else sees it, and what you can ask us to do with it. There is no payment, so there are no payment details anywhere in this."
      updated="August 2026"
      sections={SECTIONS}
    />
  );
}

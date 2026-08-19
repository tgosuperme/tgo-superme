import type { Metadata } from 'next';

import LegalPage, { type LegalSection } from '../_landing/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy | SuperMe',
  description:
    'What SuperMe collects when you register for the 5-Day Pain Reset, why, and what you can ask us to do with it.',
  robots: { index: true, follow: true },
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'What we collect',
    paragraphs: [
      'Only what we need to run the challenge and to take payment for it. Nothing is collected speculatively.',
    ],
    bullets: [
      'Your name, email address and mobile number, given by you on the checkout form.',
      'Payment confirmation from Stripe — that a payment succeeded, its amount and its reference. Your full card number never reaches us; it goes directly to Stripe.',
      'Basic technical information your browser sends to any website, such as the pages you opened and roughly where in the world you opened them from.',
    ],
  },
  {
    heading: 'Why we hold it',
    paragraphs: [
      'Your contact details exist so we can send you the joining instructions, the Zoom links and the session reminders. That is the service you paid for, and we cannot deliver it without them.',
      'Payment records exist because we are required to keep proof of the transactions we take, and because a refund cannot be processed without one.',
      'If you have told us we may, we will also email you about future SuperMe programmes. If you have not, we will not.',
    ],
  },
  {
    heading: 'Who else sees it',
    paragraphs: [
      'A small number of services that make the site work. Each one only receives what it needs to do its job, and none of them are permitted to use your details for their own purposes.',
    ],
    bullets: [
      'Stripe, to take the payment.',
      'Our email and messaging tools, to send you the joining information.',
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
      'Payment records are kept for as long as accounting and tax rules require, which is longer than we would otherwise keep anything.',
      'When a record is no longer needed for either reason, it is deleted.',
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
      'Delete your details, where we are not required to keep them.',
      'Stop emailing you. Every email we send also carries a one-click unsubscribe link.',
    ],
  },
  {
    heading: 'Cookies',
    paragraphs: [
      'The site uses the small number of cookies needed to make pages load properly and to carry your details safely through checkout. We do not use cookies to build a profile of you across other websites.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'SuperMe programmes are intended for adults. We do not knowingly collect information from anyone under 18, and if we learn that we have, we delete it.',
    ],
  },
  /* India's Digital Personal Data Protection Act 2023 and the IT Rules both
     expect a named, reachable route for a complaint about personal data — and
     expect it to be findable without having to ask. The UK version of this
     page had no such section because it did not need one.

     It deliberately does NOT invent a Grievance Officer's name. Naming a
     person who has not agreed to the role, on a page that is a legal
     undertaking, would be worse than the gap it fills. It routes to the one
     contact address the whole site uses, and the name goes in once the client
     has appointed someone. */
  {
    heading: 'If you are unhappy with how we have handled your data',
    paragraphs: [
      'Write to us at the address at the foot of this page and say so plainly. We will acknowledge you and come back to you with an answer, not a holding message.',
      'If you are in India and we have not resolved it to your satisfaction, you can escalate to the Data Protection Board of India. We would much rather you gave us the chance first.',
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
      intro="Plainly: what we collect when you register for the 5-Day Pain Reset, why we need it, who else sees it, and what you can ask us to do with it."
      updated="August 2026"
      sections={SECTIONS}
    />
  );
}

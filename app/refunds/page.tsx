import type { Metadata } from 'next';

import LegalPage, { type LegalSection } from '../_landing/legal-page';

/**
 * /refunds · kept at its original path, rewritten as a CANCELLATIONS page.
 *
 * The challenge is free, so a refund policy has nothing to describe. The route
 * survives rather than 404ing for two reasons: it is linked from the footer of
 * every page including the ones already indexed, and a reader looking for
 * "what happens if I change my mind" needs an answer whether or not money was
 * involved. What it now answers is how to give a place back, plus the one
 * thing a free offer genuinely does have to state plainly — that free means
 * free, with no card, no renewal and no later charge.
 *
 * The footer label changed with it: "Refund Policy" became "Cancellations" in
 * LEGAL_LINKS. The path did not, so nothing that already links here breaks.
 */

export const metadata: Metadata = {
  title: 'Cancellations | SuperMe',
  description:
    'The 5-Day Pain Reset is free, so there is nothing to refund. How to give your place back if you cannot make it, and what free actually means here.',
  robots: { index: true, follow: true },
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'There is nothing to refund',
    paragraphs: [
      'The 5-Day Pain Reset Challenge is free. You do not pay to attend, we do not take a card, and no payment is taken at any point — so there is no refund to ask for and no policy you have to satisfy to get one.',
      'This page exists for the question underneath that one: what to do if you have claimed a place and can no longer make it.',
    ],
  },
  {
    heading: 'What free means here',
    paragraphs: [
      'Free means free, and we would rather over-explain that than have you wondering.',
    ],
    bullets: [
      'No card details are collected, at registration or afterwards.',
      'Nothing converts into a paid plan, a subscription or a trial that later charges you.',
      'The four guides are yours to keep whether or not you attend a single session.',
      'On Day 5 we describe how to keep working with SuperMe if you would like to. That is a separate decision, made on its own terms, and declining it costs you nothing and changes nothing about the five days you have just had.',
    ],
  },
  {
    heading: 'Giving your place back',
    paragraphs: [
      'Places on a live cohort are limited by how many people one coach can actually see and correct. If you know you cannot attend, telling us means someone else can have the place.',
      'Email us using the address at the foot of this page, from the address you registered with, and say you cannot make this cohort. One line is enough. You do not need to give a reason and there is nothing to fill in.',
      'You can also simply leave the WhatsApp community, which tells us the same thing — though a message is kinder, because it reaches us sooner.',
    ],
  },
  {
    heading: 'Coming back for a later cohort',
    paragraphs: [
      'Giving a place back does not use anything up. Register again for a later cohort whenever the timing suits you, on the same terms as this one.',
    ],
  },
  {
    heading: 'If we cancel',
    paragraphs: [
      'If we cancel the challenge or cannot run it as advertised, we will tell you as soon as we know and offer you a place on the next cohort. There is no money to return, so there is nothing for you to chase and nothing for you to accept in place of it.',
    ],
  },
  {
    heading: 'Missed sessions',
    paragraphs: [
      'Every day runs twice, so there are two chances to attend each session. If you miss one entirely, there is nothing to make good — the session ran, the coach was there, and it cost you nothing either way.',
      'Replays are not guaranteed. The value of the challenge is being seen and corrected live, which is the one thing a recording cannot do.',
    ],
  },
  {
    heading: 'Your legal rights',
    paragraphs: [
      'This page sits on top of your rights under consumer law, it does not replace them. If the law gives you a stronger right than anything written here, that right applies.',
    ],
  },
];

export default function CancellationsPage() {
  return (
    <LegalPage
      eyebrow="Cancellations"
      title="It is free."
      titleAccent="So there is nothing to refund."
      intro="The whole page in one line: the challenge costs nothing, so no refund can arise. Below is how to give your place back if you cannot make it, and exactly what free means here."
      updated="August 2026"
      sections={SECTIONS}
    />
  );
}
